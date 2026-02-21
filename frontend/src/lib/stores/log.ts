import { writable } from "svelte/store"
import { browser } from "$app/environment"

export interface LogEntry {
  line: string
  count: number
  isPartialIndicator?: boolean
}

function createLogStore() {
  const { subscribe, set, update } = writable<LogEntry[]>([])
  let followMode = false
  let currentPosition = 0
  let pollInterval: ReturnType<typeof setInterval> | null = null
  let retryCount = 0
  let isPartialLog = false
  const MAX_RETRY_COUNT = 5
  const POLL_INTERVAL_MS = 2000 // 2 seconds
  const INITIAL_RETRY_DELAY_MS = 1000
  const MAX_LOG_SIZE = 200 * 1024 // 200 KB

  function parseContentRange(header: string | null): {
    start: number
    end: number
    total: number
  } | null {
    if (!header) return null
    // Content-Range: bytes start-end/total
    const match = header.match(/bytes\s+(\d+)-(\d+)\/(\d+)/)
    if (match) {
      return {
        start: parseInt(match[1], 10),
        end: parseInt(match[2], 10),
        total: parseInt(match[3], 10),
      }
    }
    return null
  }

  function processLogLines(
    lines: string[],
    append: boolean,
    showPartialIndicator: boolean = false,
  ): LogEntry[] {
    const processedLog: LogEntry[] = []

    // Add partial log indicator at the beginning if needed
    if (showPartialIndicator && !append) {
      processedLog.push({
        line: "⚠️ [PARTIAL LOG] Showing only the last 200 KB of the log file.",
        count: 1,
        isPartialIndicator: true,
      })
    }

    if (lines.length === 0) return processedLog

    let currentEntry: LogEntry = { line: lines[0], count: 1 }

    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === currentEntry.line) {
        currentEntry.count++
      } else {
        processedLog.push(currentEntry)
        currentEntry = { line: lines[i], count: 1 }
      }
    }
    processedLog.push(currentEntry)

    if (append) {
      // Merge with existing log entries
      update((existingLog) => {
        // Keep partial indicator, just append new entries
        if (existingLog.length === 0) return processedLog

        const lastEntry = existingLog[existingLog.length - 1]
        const firstNewEntry = processedLog[0]

        // Don't merge if last entry is the partial indicator
        if (lastEntry.isPartialIndicator) {
          return [...existingLog, ...processedLog]
        }

        // Merge if the last existing entry matches the first new entry
        if (firstNewEntry && lastEntry.line === firstNewEntry.line) {
          const merged = [
            ...existingLog.slice(0, -1),
            {
              line: lastEntry.line,
              count: lastEntry.count + firstNewEntry.count,
            },
            ...processedLog.slice(1),
          ]
          return merged
        }

        return [...existingLog, ...processedLog]
      })
      // Return empty array since update() handles the store modification
      return []
    }

    return processedLog
  }

  async function getLogFileSize(): Promise<number | null> {
    if (!browser) return null
    try {
      const response = await fetch("/files/log", { method: "HEAD" })
      if (response.ok) {
        const contentLength = response.headers.get("Content-Length")
        if (contentLength) {
          return parseInt(contentLength, 10)
        }
      }
    } catch (error) {
      console.error("Error getting log file size:", error)
    }
    return null
  }

  async function fetchLog(append = false, forceFull = false) {
    if (!browser) return
    try {
      const headers: HeadersInit = {}
      let shouldUseRange = false
      let rangeStart = 0

      if (followMode && currentPosition > 0 && !forceFull) {
        // In follow mode, use current position
        shouldUseRange = true
        rangeStart = currentPosition
      } else if (!append && !forceFull) {
        // For initial load or refresh, check file size first
        const fileSize = await getLogFileSize()
        if (fileSize !== null && fileSize > MAX_LOG_SIZE) {
          // File is larger than 200 KB, fetch only last 200 KB
          rangeStart = fileSize - MAX_LOG_SIZE
          shouldUseRange = true
          isPartialLog = true
        } else {
          isPartialLog = false
        }
      }

      if (shouldUseRange) {
        headers["Range"] = `bytes=${rangeStart}-`
      }

      const response = await fetch("/files/log", { headers })

      if (response.ok) {
        const logText = await response.text()

        // Parse Content-Range header to update position
        const contentRange = response.headers.get("Content-Range")
        const rangeInfo = parseContentRange(contentRange)

        if (rangeInfo) {
          // Check for file rotation: if file size is less than current position, reset
          if (rangeInfo.total < currentPosition) {
            currentPosition = 0
            isPartialLog = false
            // Re-fetch from beginning
            return fetchLog(false, false)
          }
          // Update position to end of received range + 1 (for next request)
          currentPosition = rangeInfo.end + 1
          // If we're loading the last 200 KB, we're at the end of the file
          if (isPartialLog && !append) {
            // Position is already set correctly above
          }
        } else if (response.status === 206) {
          // Partial content but no Content-Range header - shouldn't happen, but handle gracefully
          currentPosition += new Blob([logText]).size
        } else if (!followMode || currentPosition === 0) {
          // Full response - update position to file size
          currentPosition = new Blob([logText]).size
        }

        const lines = logText.split("\n").filter((line) => line.length > 0)

        if (lines.length > 0 || !append) {
          const showPartialIndicator = isPartialLog && !append
          const processedLog = processLogLines(
            lines,
            append,
            showPartialIndicator,
          )
          if (append) {
            // processLogLines already updated the store via update()
            return
          }
          set(processedLog)
        }

        // Reset retry count on success
        retryCount = 0
      } else if (response.status === 416) {
        // Range Not Satisfiable - file might have been rotated or cleared
        currentPosition = 0
        if (!append) {
          set([])
        }
        retryCount = 0
      } else {
        if (!append) {
          set([])
        }
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error("Error fetching log:", error)

      // Exponential backoff on errors
      retryCount++
      if (retryCount < MAX_RETRY_COUNT && followMode) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount - 1)
        setTimeout(() => {
          if (followMode) {
            fetchLog(true)
          }
        }, delay)
      } else if (!append) {
        set([])
      }
    }
  }

  function startFollow() {
    if (!browser || followMode) return

    followMode = true
    retryCount = 0

    // Initial fetch - check size and load appropriately
    currentPosition = 0
    fetchLog(false, false).then(() => {
      // Start polling after initial fetch
      if (followMode) {
        pollInterval = setInterval(() => {
          if (followMode) {
            fetchLog(true)
          }
        }, POLL_INTERVAL_MS)
      }
    })
  }

  function stopFollow() {
    if (!browser || !followMode) return

    followMode = false
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    retryCount = 0
  }

  function isFollowing() {
    return followMode
  }

  return {
    subscribe,
    fetchLog: () => fetchLog(false, false),
    startFollow,
    stopFollow,
    isFollowing,
    clearLog: async () => {
      if (!browser) return
      try {
        await fetch("/api/system/log/clear", { method: "POST" })
        currentPosition = 0
        isPartialLog = false
        fetchLog(false, false)
      } catch (error) {
        console.error("Error clearing log:", error)
      }
    },
  }
}

export const logStore = createLogStore()
