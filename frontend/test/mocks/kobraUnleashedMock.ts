// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2024-2026 Chris Suszynski (@cardil)
import { Server as SocketIOServer } from "socket.io"
import { mockPrinter, type Printer, type PrintJob } from "./kobraData"
import type { ViteDevServer, Connect } from "vite"
import { initializeHmrBridge } from "./hmr"

// This will hold the "real" state of the print job for simulation purposes
interface PrintSimulation {
  totalPrintTime: number // The total real duration of the print in seconds
  startTime: number // The timestamp when the print started
  shouldPubliclyHaveEta: boolean // Flag to control if the UI sees the ETA
  shouldHaveTotalLayers: boolean // Flag to control if the UI sees total layers
  speedMultiplier: number
}

let printer: Printer = JSON.parse(JSON.stringify(mockPrinter)) // Deep copy to prevent mutation
let printJobInterval: NodeJS.Timeout | null = null
let tempInterval: NodeJS.Timeout | null = null
let simulation: PrintSimulation | null = null

const ROOM_TEMP = 25
const TARGET_NOZZLE_TEMP = 215
const TARGET_BED_TEMP = 60
const PREHEAT_SECONDS = 15
const COOLDOWN_SECONDS = 10
const BASE_SIMULATION_SPEED = 10

/**
 * Clears all active simulation intervals.
 */
function clearAllIntervals() {
  if (printJobInterval) {
    clearInterval(printJobInterval)
    printJobInterval = null
  }
  if (tempInterval) {
    clearInterval(tempInterval)
    tempInterval = null
  }
}

function calculateSpeedMultiplier(totalPrintTimeSeconds: number): number {
  const tenMinutesInSeconds = 10 * 60
  if (totalPrintTimeSeconds <= tenMinutesInSeconds) {
    return BASE_SIMULATION_SPEED
  }
  const printTimeMinutes = totalPrintTimeSeconds / 60
  const multiplier = BASE_SIMULATION_SPEED + (printTimeMinutes - 10)
  return Math.round(multiplier)
}

function initiatePrintJob(
  io: SocketIOServer,
  filename: string,
  fileSize: number,
) {
  clearAllIntervals()

  // Remove the file if it already exists in the history to simulate an update
  const existingFileIndex = printer.files[0].findIndex(
    (f) => f.filename === filename,
  )
  if (existingFileIndex > -1) {
    printer.files[0].splice(existingFileIndex, 1)
  }

  // Add the newly printed file to the top of the history
  const newFile = {
    filename,
    size: fileSize,
    timestamp: Date.now(),
    is_dir: false,
    is_local: true,
  }
  printer.files[0].unshift(newFile)

  // Heuristics for print time and layers
  const fileSizeInKb = fileSize / 1024
  const estimatedPrintTime = (fileSizeInKb / 100) * 6 * 60 // 100KB = 6 mins
  const totalLayers = Math.max(10, Math.floor(estimatedPrintTime / 30)) // Avg 30s per layer

  // 50% chance of having no ETA from the slicer
  const hasEta = Math.random() < 0.5
  const hasTotalLayers = Math.random() < 0.5
  if (!hasEta) {
    console.log("📠 [Kobra Mock] Simulating a job with no initial ETA.")
  }
  if (!hasTotalLayers) {
    console.log("📠 [Kobra Mock] Simulating a job with no total layers.")
  }

  // Set up the internal simulation state
  const speedMultiplier = calculateSpeedMultiplier(estimatedPrintTime)
  simulation = {
    totalPrintTime: estimatedPrintTime,
    startTime: 0, // Will be set when preheating finishes
    shouldPubliclyHaveEta: hasEta,
    shouldHaveTotalLayers: hasTotalLayers,
    speedMultiplier,
  }

  printer.state = "downloading"
  printer.print_job = {
    taskid: Math.random().toString(36).substring(7),
    filename: filename,
    filepath: "/",
    state: "downloading",
    remaining_time: hasEta ? estimatedPrintTime : 0,
    progress: 0,
    print_time: 0,
    supplies_usage: 0,
    total_layers: hasTotalLayers ? totalLayers : -1,
    curr_layer: 0,
    fan_speed: -1,
    z_offset: 0.0,
    print_speed_mode: -1,
  }
  emitPrinterUpdate(io, printer)
  console.log(
    `📠 [Kobra Mock] Downloading ${filename}, estimated time: ${estimatedPrintTime}s`,
  )

  // Transition to preheating after a short delay
  setTimeout(() => {
    startPreheating(io)
  }, 1500)
}

export function createKobraUnleashedHttpMiddleware(
  io: SocketIOServer,
): Connect.NextHandleFunction {
  return (req, res, next) => {
    // Handle Kobra Unleashed HTTP API mocks
    if (req.url?.startsWith("/api/")) {
      const filesUrlRegex = /^\/api\/printer\/([a-zA-Z0-9]+)\/files$/
      const printUrlRegex = /^\/api\/print$/

      const filesMatch = req.url.match(filesUrlRegex)
      const printMatch = req.url.match(printUrlRegex)

      if (filesMatch && req.method === "GET") {
        const printerId = filesMatch[1]
        if (printerId === printer.id) {
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify(printer.files[0])) // Return local files
        } else {
          res.writeHead(404)
          res.end("Printer not found")
        }
        return
      }

      if (printMatch && req.method === "POST") {
        if (printer.state === "free") {
          let body = ""
          req.on("data", (chunk) => {
            body += chunk.toString()
          })

          req.on("end", () => {
            const filenameMatch = body.match(/filename="([^"]+)"/)
            const filename = filenameMatch
              ? filenameMatch[1]
              : `uploaded_file_${Date.now()}.gcode`

            initiatePrintJob(io, filename, body.length)

            res.writeHead(200)
            res.end("File uploaded successfully")
          })
        } else {
          res.writeHead(400)
          res.end("Printer is busy")
        }
        return
      }
    }

    // Handle webserver API mocks (passthrough)
    next()
  }
}

export function createKobraUnleashedSocketMock(server: ViteDevServer) {
  if (!server.httpServer) {
    console.error("HTTP server is not available")
    return
  }
  const io = new SocketIOServer(server.httpServer, {
    cors: {
      origin: "*",
    },
  })
  ;(global as any).socket = io
  attachSocketListeners(io)

  // Initialize the HMR bridge for mock control
  initializeHmrBridge(server, io, printer)

  // Return the io instance so it can be used by the HTTP mock
  return io
}

function getPrinterStateWithoutFiles(p: Printer): Omit<Printer, "files"> {
  const printerState = { ...p }
  delete (printerState as Partial<Printer>).files
  return printerState
}

function attachSocketListeners(io: SocketIOServer) {
  io.on("connection", (socket) => {
    console.log("🔌 [Kobra Mock] Client connected")

    // Emit a minimal initial state to enable the UI, but without files.
    socket.emit("printer_list", {
      [printer.id]: getPrinterStateWithoutFiles(printer),
    })

    socket.on("get_printer_list", () => {
      socket.emit("printer_list", {
        [printer.id]: getPrinterStateWithoutFiles(printer),
      })
    })

    socket.on("print_file", (data, callback) => {
      if (printer.state === "free") {
        const { printerId, file } = data
        if (printerId !== printer.id) {
          if (callback)
            callback({ status: "error", message: "Printer not found" })
          return
        }
        const fileData = printer.files[0].find((f) => f.filename === file)
        const fileSize = fileData?.size ?? 200000
        initiatePrintJob(io, file, fileSize)
        if (callback) callback({ status: "ok" })
      } else {
        if (callback) callback({ status: "error", message: "Printer is busy" })
      }
    })

    socket.on("stop_print", (data, callback) => {
      const { id } = data
      if (id !== printer.id) {
        if (callback)
          callback({ status: "error", message: "Printer not found" })
        return
      }
      stopPrintSimulation(io, "failed")
      if (callback) callback({ status: "ok" })
    })

    socket.on("pause_print", (data, callback) => {
      const { id } = data
      if (id !== printer.id) {
        if (callback)
          callback({ status: "error", message: "Printer not found" })
        return
      }
      if (printer.state === "printing" && printer.print_job) {
        printer.state = "paused"
        printer.print_job.state = "paused"
        clearAllIntervals()
        emitPrinterUpdate(io, printer)
        console.log("📠 [Kobra Mock] Paused print job.")
        if (callback) callback({ status: "ok" })
      } else {
        if (callback)
          callback({
            status: "error",
            message: `Cannot pause, printer state is '${printer.state}'`,
          })
      }
    })

    socket.on("resume_print", (data, callback) => {
      const { id } = data
      if (id !== printer.id) {
        if (callback)
          callback({ status: "error", message: "Printer not found" })
        return
      }
      if (printer.state === "paused" && printer.print_job) {
        startPrintSimulation(io)
        console.log("📠 [Kobra Mock] Resumed print job.")
        if (callback) callback({ status: "ok" })
      } else {
        if (callback)
          callback({
            status: "error",
            message: `Cannot resume, printer state is '${printer.state}'`,
          })
      }
    })

    socket.on("set_fan", (data, callback) => {
      const { id, speed } = data
      if (id !== printer.id) {
        if (callback)
          callback({ status: "error", message: "Printer not found" })
        return
      }
      if (printer.print_job) {
        printer.print_job.fan_speed = speed
        emitPrinterUpdate(io, printer)
        if (callback) callback({ status: "ok" })
      } else {
        if (callback)
          callback({ status: "error", message: "No active print job" })
      }
    })

    socket.on("disconnect", () => {
      console.log("🔌 [Kobra Mock] Client disconnected")
    })
  })
}

/**
 * Emits a 'printer_updated' event via WebSocket, ensuring the 'files' array is excluded
 * to accurately simulate the behavior of the real Kobra Unleashed API.
 * @param io The Socket.IO server instance.
 */
export function emitPrinterUpdate(io: SocketIOServer, printer: Printer) {
  const publicPrinter = JSON.parse(JSON.stringify(printer)) // Deep copy
  if (
    simulation &&
    publicPrinter.print_job &&
    !simulation.shouldPubliclyHaveEta
  ) {
    publicPrinter.print_job.remaining_time = 0
  }
  const payload = publicPrinter
  io.emit("printer_updated", {
    id: printer.id,
    printer: getPrinterStateWithoutFiles(payload),
  })
}

function startPrintSimulation(io: SocketIOServer) {
  if (printJobInterval || !printer.print_job || !simulation) return

  printer.state = "printing"
  printer.print_job.state = "printing"
  // To resume correctly, we calculate what the startTime *would have been*
  // if the print had been running continuously at the accelerated speed to
  // reach the current `print_time`.
  const simulatedElapsedTimeInSeconds = (printer.print_job.print_time ?? 0) * 60
  const wallClockTimeEquivalent =
    (simulatedElapsedTimeInSeconds * 1000) / simulation.speedMultiplier
  simulation.startTime = Date.now() - wallClockTimeEquivalent

  emitPrinterUpdate(io, printer)
  console.log(
    `📠 [Kobra Mock] Starting time-based print simulation (Speed: ${simulation.speedMultiplier}x).`,
  )

  const simulationInterval = 250 // Update 4 times per second for smoothness

  // Simulate the real firmware behavior from MQTT capture:
  // - print/start messages (~10x more frequent) reset settings to defaults
  //   because kobra-unleashed recreates PrintJob on every start message
  // - print/update messages arrive every ~20s real-world time
  // This reproduces the bug described in issue #10.
  //
  // Scale the update period by speedMultiplier so it feels right at any speed:
  // real 20s / speedMultiplier / 0.25s per tick = 80 / speedMultiplier ticks
  const updatePeriodTicks = Math.max(
    4,
    Math.round(80 / simulation.speedMultiplier),
  )
  // Randomize initial offset so first update arrives at an unpredictable point
  let tickCount = Math.floor(Math.random() * updatePeriodTicks)

  printJobInterval = setInterval(() => {
    const job = printer.print_job!
    const sim = simulation!
    const wallClockTime = (Date.now() - sim.startTime) / 1000 // in seconds
    const elapsedTime = wallClockTime * sim.speedMultiplier

    if (elapsedTime >= sim.totalPrintTime) {
      stopPrintSimulation(io, "done")
      return
    }

    job.print_time = elapsedTime / 60
    job.progress = Math.min(
      100,
      Math.round((elapsedTime / sim.totalPrintTime) * 100),
    )
    job.remaining_time = sim.totalPrintTime - elapsedTime
    job.curr_layer = Math.floor((job.progress / 100) * job.total_layers)
    const filamentIncrease =
      (Math.random() * 2 + 1) *
      (simulationInterval / 1000) *
      sim.speedMultiplier
    job.supplies_usage += filamentIncrease

    tickCount++
    const isUpdateTick = tickCount % updatePeriodTicks === 0
    if (isUpdateTick) {
      // Simulate print/update: set real values (Sport mode during print,
      // fan oscillates between 50-100% as the firmware adjusts cooling)
      job.fan_speed = 50 + Math.floor(Math.random() * 6) * 10 // 50,60,70,80,90,100
      job.z_offset = -1.57
      job.print_speed_mode = 2 // Sport during active print
    } else {
      // Simulate print/start: kobra-unleashed resets to sentinel defaults
      job.fan_speed = -1
      job.z_offset = 0.0
      job.print_speed_mode = -1
    }

    emitPrinterUpdate(io, printer)
  }, simulationInterval)
}

function stopPrintSimulation(
  io: SocketIOServer,
  finalState: "done" | "failed",
) {
  const currentSimulation = simulation
  clearAllIntervals()
  simulation = null

  const job = printer.print_job
  if (!job) {
    printer.state = "free"
    emitPrinterUpdate(io, printer)
    return
  }

  job.state = finalState
  job.progress = finalState === "done" ? 100 : job.progress

  if (finalState === "done" && currentSimulation) {
    job.print_time = currentSimulation.totalPrintTime / 60
  }
  startCooldown(io)

  printer.state = "free"
  emitPrinterUpdate(io, printer)

  setTimeout(() => {
    printer.print_job = null
    emitPrinterUpdate(io, printer)
  }, 2000)
}

function startPreheating(io: SocketIOServer) {
  clearAllIntervals()
  printer.state = "preheating"
  printer.print_job!.state = "preheating"
  printer.target_nozzle_temp = String(TARGET_NOZZLE_TEMP)
  printer.target_hotbed_temp = String(TARGET_BED_TEMP)
  if (printer.print_job) {
    printer.print_job.remaining_time = -1
  }
  emitPrinterUpdate(io, printer)
  console.log("📠 [Kobra Mock] Preheating...")

  const steps = PREHEAT_SECONDS
  let currentStep = 0
  const initialNozzleTemp = Number(printer.nozzle_temp)
  const initialBedTemp = Number(printer.hotbed_temp)
  // Pick a random step during preheating where print/update brings real values.
  // Real firmware sends print/update every ~20s during preheating too.
  // We pick 1-2 random steps to simulate this.
  const updateStep = 1 + Math.floor(Math.random() * (steps - 2))

  tempInterval = setInterval(() => {
    currentStep++
    if (currentStep > steps) {
      clearAllIntervals()
      printer.nozzle_temp = String(TARGET_NOZZLE_TEMP)
      printer.hotbed_temp = String(TARGET_BED_TEMP)
      startPrintSimulation(io)
      return
    }

    const fraction = currentStep / steps
    printer.nozzle_temp = String(
      Math.round(
        initialNozzleTemp + (TARGET_NOZZLE_TEMP - initialNozzleTemp) * fraction,
      ),
    )
    printer.hotbed_temp = String(
      Math.round(
        initialBedTemp + (TARGET_BED_TEMP - initialBedTemp) * fraction,
      ),
    )

    // Simulate print/update arriving during preheating: one step carries real
    // settings (Standard mode, fan at 100%), all others reset to sentinel
    // defaults (from kobra-unleashed recreating PrintJob on print/start)
    const job = printer.print_job
    if (job) {
      if (currentStep === updateStep) {
        job.fan_speed = 100
        job.z_offset = -1.57
        job.print_speed_mode = 1 // Standard during preheating
      } else {
        job.fan_speed = -1
        job.z_offset = 0.0
        job.print_speed_mode = -1
      }
    }

    emitPrinterUpdate(io, printer)
  }, 1000)
}

function startCooldown(io: SocketIOServer) {
  clearAllIntervals()
  printer.target_nozzle_temp = "0"
  printer.target_hotbed_temp = "0"
  emitPrinterUpdate(io, printer)
  console.log("📠 [Kobra Mock] Cooling down...")

  const steps = COOLDOWN_SECONDS
  let currentStep = 0
  const initialNozzleTemp = Number(printer.nozzle_temp)
  const initialBedTemp = Number(printer.hotbed_temp)

  tempInterval = setInterval(() => {
    currentStep++
    if (currentStep > steps) {
      clearInterval(tempInterval!)
      tempInterval = null
      printer.nozzle_temp = String(ROOM_TEMP)
      printer.hotbed_temp = String(ROOM_TEMP)
      emitPrinterUpdate(io, printer)
      return
    }

    const fraction = currentStep / steps
    printer.nozzle_temp = String(
      Math.round(
        initialNozzleTemp - (initialNozzleTemp - ROOM_TEMP) * fraction,
      ),
    )
    printer.hotbed_temp = String(
      Math.round(initialBedTemp - (initialBedTemp - ROOM_TEMP) * fraction),
    )
    emitPrinterUpdate(io, printer)
  }, 1000)
}
