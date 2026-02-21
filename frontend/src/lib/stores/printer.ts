import { get, writable } from "svelte/store"
import io from "socket.io-client"
import { webserverStore } from "./webserver"
import { activePrinterIdStore } from "./activePrinterId"
import { kobraConnectionStore } from "./kobraConnection"

// Define the structure for a file on the printer
export interface PrinterFile {
  name: string // Mapped from 'filename'
  size: number
  timestamp: number
  is_dir: boolean
  is_local: boolean
}

// Define the structure for a print job
export interface PrintJob {
  taskid: string
  filename: string
  filepath: string
  state: string
  remaining_time: number
  progress: number
  print_time: number // minutes, as floating number 1.933 means 1m 56s
  supplies_usage: number
  total_layers: number
  curr_layer: number
  fan_speed: number
  z_offset: number
  print_speed_mode: number
}

// Define the structure for the printer data
export interface Printer {
  id: string
  name: string
  model_id: string
  fwver: number
  online: boolean
  state: string
  nozzle_temp: string
  target_nozzle_temp: string
  hotbed_temp: string
  target_hotbed_temp: string
  print_job: PrintJob | null
  files: PrinterFile[]
}

/**
 * Transforms the raw printer data from the Kobra Unleashed API into the format
 * expected by the frontend UI components.
 * @param rawPrinter The raw printer object from the API.
 * @returns A transformed Printer object.
 */
function transformRawPrinterData(rawPrinter: any): Printer {
  // The API returns files as a 2D array: [localFiles, udiskFiles]
  // We'll take the local files list.
  const files =
    rawPrinter.files &&
    Array.isArray(rawPrinter.files) &&
    rawPrinter.files.length > 0
      ? rawPrinter.files[0].map((file: any) => ({
          name: file.filename,
          size: file.size,
          timestamp: file.timestamp,
          is_dir: file.is_dir,
          is_local: file.is_local,
        }))
      : []

  return {
    ...rawPrinter,
    files,
  }
}

import { browser } from "$app/environment"

function createPrinterStore() {
  const { subscribe, set, update } = writable<{ [id: string]: Printer }>({})
  let socket: any

  webserverStore.subscribe((config) => {
    // Disconnect from the old socket if it exists
    if (socket) {
      socket.disconnect()
      socket = undefined
      set({})
    }

    if (!config) {
      kobraConnectionStore.set("unavailable")
      return
    }

    // Connect to the new socket if a URL is provided
    if (config.mqtt_webui_url) {
      kobraConnectionStore.set("connecting")
      socket = io(config.mqtt_webui_url, {
        transports: ["websocket"],
        reconnectionAttempts: 5,
      })
      if (browser && import.meta.env.DEV) {
        ;(window as any).socket = socket
      }

      socket.on("connect", () => {
        kobraConnectionStore.set("connected")
        console.log("Connected to Kobra Unleashed")
        socket?.emit("get_printer_list")
      })

      socket.on("connect_error", (err: Error) => {
        kobraConnectionStore.set("error")
        console.error("Connection to Kobra Unleashed failed:", err.message)
      })

      socket.on("printer_list", (printers: { [id: string]: any }) => {
        const transformedPrinters: { [id: string]: Printer } = {}
        for (const id in printers) {
          transformedPrinters[id] = transformRawPrinterData(printers[id])
        }
        set(transformedPrinters)
        // Automatically select the first printer if one isn't already selected
        // or if the currently selected one no longer exists.
        const printerIds = Object.keys(transformedPrinters)
        if (printerIds.length > 0) {
          const currentActiveId = get(activePrinterIdStore)
          if (!currentActiveId || !transformedPrinters[currentActiveId]) {
            activePrinterIdStore.select(printerIds[0])
          }
        }
      })

      socket.on(
        "printer_updated",
        ({ id, printer }: { id: string; printer: any }) => {
          update((currentPrinters) => {
            const existingPrinter = currentPrinters[id]
            const updatedPrinter = transformRawPrinterData(printer)

            // Always preserve the file list from the existing state, as the
            // 'printer_updated' event does not contain it. The file list is
            // managed separately by the `refreshFiles` function.
            if (existingPrinter) {
              updatedPrinter.files = existingPrinter.files
            }

            return {
              ...currentPrinters,
              [id]: updatedPrinter,
            }
          })
        },
      )
      socket.on("disconnect", () => {
        kobraConnectionStore.set("error")
        console.log("Disconnected from Kobra Unleashed")
        set({}) // Clear printers on disconnect
      })
    } else {
      kobraConnectionStore.set("unavailable")
    }
  })

  // Helper to safely emit socket commands
  const emitCommand = (command: string, payload: object) => {
    if (socket?.connected) {
      socket
        .timeout(5000)
        .emit(command, payload, (err: Error | null, response: any) => {
          if (err) {
            console.error(
              `Socket command '${command}' timed out. The printer may be unresponsive or the backend service has crashed.`,
              { payload, error: err },
            )
          } else if (response && response.status === "error") {
            console.error(
              `Socket command '${command}' failed with an error response from the server.`,
              {
                payload,
                response,
              },
            )
          }
        })
    } else {
      console.warn(`Socket not connected. Cannot emit command '${command}'.`)
    }
  }

  return {
    subscribe,

    // Triggers the backend to refresh the file list for a specific printer.
    // The update will be pushed back via the 'printer_updated' event.
    refreshFiles: async (printerId: string) => {
      const config = get(webserverStore)
      if (config?.mqtt_webui_url) {
        try {
          const response = await fetch(
            `${config.mqtt_webui_url}/api/printer/${printerId}/files`,
          )
          if (!response.ok) {
            throw new Error(`Failed to fetch files: ${response.statusText}`)
          }
          const files = await response.json()
          update((printers) => {
            const existingPrinter = printers[printerId]
            if (existingPrinter) {
              const localFiles = files.map((file: any) => ({
                name: file.filename,
                size: file.size,
                timestamp: file.timestamp,
                is_dir: file.is_dir,
                is_local: file.is_local,
              }))
              const updatedPrinter = {
                ...existingPrinter,
                files: localFiles,
              }
              const newState = {
                ...printers,
                [printerId]: updatedPrinter,
              }
              return newState
            }
            return printers
          })
        } catch (error) {
          console.error("Error refreshing files:", error)
        }
      }
    },

    startPrint: (printerId: string, filename: string) => {
      emitCommand("start_print", { printerId: printerId, filename })
    },

    pausePrint: (printerId: string) => {
      emitCommand("pause_print", { id: printerId })
    },

    resumePrint: (printerId: string) => {
      emitCommand("resume_print", { id: printerId })
    },

    stopPrint: (printerId: string) => {
      emitCommand("stop_print", { id: printerId })
    },

    reprint: (printerId: string, filename: string) => {
      emitCommand("print_file", { printerId: printerId, file: filename })
    },
  }
}

export const printerStore = createPrinterStore()
