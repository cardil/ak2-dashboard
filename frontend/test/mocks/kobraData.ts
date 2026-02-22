export interface PrintJob {
  taskid: string
  filename: string
  filepath: string
  state:
    | "printing"
    | "paused"
    | "done"
    | "failed"
    | "unknown"
    | "downloading"
    | "preheating"
  remaining_time: number
  progress: number
  print_time: number
  supplies_usage: number
  total_layers: number
  curr_layer: number
  fan_speed: number
  z_offset: number
  print_speed_mode: number
}

export interface FileElement {
  filename: string
  size: number
  timestamp: number
  is_dir: boolean
  is_local: boolean
}

export interface Printer {
  id: string
  name: string
  model_id: string
  fwver: number
  online: boolean
  state:
    | "free"
    | "printing"
    | "paused"
    | "offline"
    | "failed"
    | "downloading"
    | "checking"
    | "preheating"
    | "busy"
  nozzle_temp: string
  target_nozzle_temp: string
  hotbed_temp: string
  target_hotbed_temp: string
  print_job: PrintJob | null
  files: FileElement[][]
}

const staticFileNames = [
  "benchy.gcode",
  "flat-test.gcode",
  "calibration-cube.gcode",
  "wh40k-spacemarine.gcode",
]

function generateRandomString(length: number) {
  let result = ""
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
}

const largeFileList = Array.from({ length: 95 }, (_, i) => {
  const staticFileName = staticFileNames[i % staticFileNames.length]
  const maxTimestamp = Date.now()
  const minTimestamp = maxTimestamp - 1.5 * 365 * 24 * 3600 * 1000
  const timestamp = Math.floor(
    Math.random() * (maxTimestamp - minTimestamp) + minTimestamp,
  )
  const randomString = generateRandomString(16)
  const formattedTimestamp = formatTimestamp(timestamp)
  return {
    filename: `${staticFileName.replace(
      ".gcode",
      "",
    )}_${randomString}_${formattedTimestamp}.gcode`,
    size: Math.floor(Math.random() * 2000000),
    timestamp: timestamp,
    is_dir: false,
    is_local: true,
  }
}).sort((a, b) => b.timestamp - a.timestamp)

const combinedFileList = largeFileList

export const mockPrinter: Printer = {
  id: "9347a110c5423fe412ce45533bfc10e6",
  name: "Kobra Mock",
  model_id: "20021",
  fwver: 312,
  online: true,
  state: "free",
  nozzle_temp: "25",
  target_nozzle_temp: "0",
  hotbed_temp: "25",
  target_hotbed_temp: "0",
  print_job: null,
  files: [
    combinedFileList,
    [], // Udisk files
  ],
}
