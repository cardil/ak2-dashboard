// Mock log functionality for testing
// Generates and manages a mock log file that can simulate large log files

const MAX_LOG_SIZE = 200 * 1024 // 200 KB - threshold for partial log loading

// Initial log content
let mockLogContent: string[] = [
  "2025-01-15 10:00:00 [INFO] System initialized",
  "2025-01-15 10:00:01 [INFO] Starting web server",
  "2025-01-15 10:00:02 [INFO] Socket.IO server started",
  "2025-01-15 10:00:02 [INFO] Socket.IO server started",
  "2025-01-15 10:00:02 [INFO] Socket.IO server started",
  "2025-01-15 10:00:03 [INFO] API endpoints registered",
  "2025-01-15 10:00:05 [INFO] Printer connection established",
  "2025-01-15 10:00:10 [WARN] Temperature sensor reading high",
  "2025-01-15 10:00:10 [WARN] Temperature sensor reading high",
  "2025-01-15 10:00:15 [INFO] Print job started: test.gcode",
  "2025-01-15 10:00:20 [ERROR] Failed to read file: missing.gcode",
  "2025-01-15 10:00:20 [ERROR] Failed to read file: missing.gcode",
  "2025-01-15 10:00:20 [ERROR] Failed to read file: missing.gcode",
  "2025-01-15 10:00:20 [ERROR] Failed to read file: missing.gcode",
  "2025-01-15 10:00:20 [ERROR] File not found in storage",
  "2025-01-15 10:00:25 [INFO] Print job paused by user",
  "2025-01-15 10:00:30 [INFO] Print job resumed",
  "2025-01-15 10:00:30 [INFO] Print job resumed",
  "2025-01-15 10:00:35 [INFO] Print job completed successfully",
  "2025-01-15 10:00:40 [INFO] System idle",
  "2025-01-15 10:00:40 [INFO] System idle",
  "2025-01-15 10:00:40 [INFO] System idle",
  "2025-01-15 10:00:45 [INFO] Processing G-code command: G28 X Y Z\n  Homing all axes\n  Moving to origin position",
  "2025-01-15 10:00:50 [DEBUG] Long debug message with multiple details: X position: 100.5mm, Y position: 200.3mm, Z position: 0.2mm, Extruder temperature: 200°C, Bed temperature: 60°C, Fan speed: 50%, Print speed: 100mm/s",
  "2025-01-15 10:00:55 [INFO] Multi-line status update:\n  Current layer: 15/100\n  Progress: 15%\n  Estimated time remaining: 45 minutes\n  Material used: 12.5g",
  "2025-01-15 10:01:00 [WARN] This is a very long warning message that contains a lot of information about the current state of the printer including temperature readings, position data, and various sensor values that need to be displayed properly in the log viewer",
  "2025-01-15 10:01:05 [ERROR] Critical error occurred during print operation:\n  Error code: E1234\n  Description: Extruder temperature too low\n  Action: Pausing print job\n  Recovery: Please check extruder heating element",
]

// Additional log entries that will be added over time to simulate log growth
const additionalLogEntries: string[] = [
  "2025-01-15 10:01:10 [INFO] System check completed",
  "2025-01-15 10:01:15 [INFO] Temperature stabilized",
  "2025-01-15 10:01:20 [INFO] New print job queued",
  "2025-01-15 10:01:25 [WARN] Low filament warning",
  "2025-01-15 10:01:30 [INFO] Filament sensor triggered",
  "2025-01-15 10:01:35 [INFO] Print job started: model_v2.gcode",
  "2025-01-15 10:01:40 [INFO] Layer 1/50 completed",
  "2025-01-15 10:01:45 [INFO] Layer 2/50 completed",
  "2025-01-15 10:01:50 [INFO] Layer 3/50 completed",
]

let logEntryIndex = 0
let logGrowthInterval: NodeJS.Timeout | null = null

// Generate a large log entry template
function generateLogEntry(
  timestamp: string,
  level: "INFO" | "WARN" | "ERROR" | "DEBUG",
  message: string,
): string {
  return `${timestamp} [${level}] ${message}`
}

// Generate historical log entries to create a large log file (>200 KB)
function generateLargeLog(): string[] {
  const largeLog: string[] = []
  const baseDate = new Date("2025-01-10T00:00:00")
  const logMessages = [
    "System heartbeat check completed successfully",
    "Temperature sensor reading: Extruder=200°C, Bed=60°C",
    "G-code command processed: G1 X10 Y20 Z0.2 E5.0",
    "Layer progress update: Current layer 15/100, ETA: 45 minutes",
    "Filament sensor status: OK, Flow rate: 100%",
    "Network connection check: Connected, Latency: 12ms",
    "Memory usage: Used 45MB / Total 128MB (35%)",
    "Print job status: Printing, Progress: 15%",
    "Motor position update: X=100.5mm Y=200.3mm Z=0.2mm",
    "Fan speed adjustment: Cooling fan set to 50%",
    "Heater status: Extruder heating, Target: 200°C",
    "Bed leveling check: All points within tolerance",
    "File system check: 125 files found, 2.5GB free space",
    "USB connection: Device detected, Mounted successfully",
    "WiFi signal strength: -45dBm, Excellent connection",
    "Firmware version check: v2.1.3, Up to date",
    "Calibration routine: X-axis homed successfully",
    "Print queue: 3 jobs pending, Next: model_v2.gcode",
    "Temperature warning: Bed temperature slightly high (+2°C)",
    "Power supply: Voltage stable at 24.0V, Current: 8.5A",
  ]

  // Generate ~250 KB of log entries (enough to exceed the 200 KB limit)
  let totalSize = 0
  const targetSize = 250 * 1024 // 250 KB
  let entryCount = 0

  while (totalSize < targetSize) {
    const date = new Date(baseDate)
    date.setSeconds(date.getSeconds() + entryCount * 5) // 5 seconds between entries
    const timestamp = date.toISOString().slice(0, 19).replace("T", " ")

    const level =
      entryCount % 50 === 0
        ? "ERROR"
        : entryCount % 20 === 0
          ? "WARN"
          : entryCount % 5 === 0
            ? "DEBUG"
            : "INFO"

    const message =
      logMessages[entryCount % logMessages.length] +
      (entryCount % 10 === 0
        ? ` | Additional debug data: ${Math.random().toFixed(6)}, Timestamp: ${Date.now()}`
        : "")

    const logLine = generateLogEntry(timestamp, level, message)
    largeLog.push(logLine)

    // Estimate size (approximate, actual size may vary)
    totalSize += Buffer.byteLength(logLine + "\n", "utf8")
    entryCount++

    // Safety limit to prevent infinite loops
    if (entryCount > 10000) break
  }

  return largeLog
}

// Initialize with a large log if needed
let useLargeLog = true // Set to true to simulate a large log file

if (useLargeLog) {
  const largeLog = generateLargeLog()
  mockLogContent = [...largeLog, ...mockLogContent]
}

// Function to get the current log content as a string
export function getLogContent(): string {
  return mockLogContent.join("\n")
}

// Function to get log content size in bytes
export function getLogContentSize(): number {
  return Buffer.byteLength(getLogContent(), "utf8")
}

// Function to add a new log entry (simulates log growth)
function addLogEntry() {
  if (logEntryIndex < additionalLogEntries.length) {
    mockLogContent.push(additionalLogEntries[logEntryIndex])
    logEntryIndex++
  } else {
    // After all predefined entries, generate new ones
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ")
    const messages = [
      "[INFO] System heartbeat",
      "[INFO] Temperature check: OK",
      "[DEBUG] Memory usage: normal",
      "[INFO] Network connection stable",
      "[WARN] Minor temperature fluctuation",
    ]
    const randomMessage = messages[Math.floor(Math.random() * messages.length)]
    mockLogContent.push(`${timestamp} ${randomMessage}`)
  }
}

// Start log growth simulation (adds new entries every 3 seconds)
export function startLogGrowth() {
  if (logGrowthInterval) return
  logGrowthInterval = setInterval(() => {
    addLogEntry()
  }, 3000)
}

// Stop log growth simulation
export function stopLogGrowth() {
  if (logGrowthInterval) {
    clearInterval(logGrowthInterval)
    logGrowthInterval = null
  }
}

// Clear the log (resets to initial state)
export function clearLog() {
  mockLogContent = [
    `${new Date().toISOString().slice(0, 19).replace("T", " ")} [INFO] Log cleared`,
  ]
  logEntryIndex = 0
}

// Get log content for a specific byte range
export function getLogContentRange(start: number, end?: number): string {
  const fullContent = getLogContent()
  const buffer = Buffer.from(fullContent, "utf8")
  const endPos =
    end !== undefined ? Math.min(end, buffer.length) : buffer.length
  return buffer.subarray(start, endPos).toString("utf8")
}

// Cleanup on Vite HMR reload
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopLogGrowth()
  })
}

// Note: startLogGrowth() should be called explicitly when the mock server starts,
// not at module load time, to avoid keeping the Node.js process alive during builds
