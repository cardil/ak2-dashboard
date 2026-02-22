/**
 * Parses an uptime string in "HH:MM:SS" format into a total number of seconds.
 * @param uptimeString The uptime string to parse.
 * @returns The total number of seconds, or 0 if the string is invalid.
 */
export function parseUptime(uptimeString: string): number {
  if (!uptimeString || typeof uptimeString !== "string") return 0
  const parts = uptimeString.split(":").map(Number)
  if (parts.length === 3 && parts.every((p) => !isNaN(p))) {
    const [hours, minutes, seconds] = parts
    if (minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return 0
    return hours * 3600 + minutes * 60 + seconds
  }
  return 0
}

/**
 * Formats a Unix timestamp into a human-readable duration string representing the time elapsed
 * since the timestamp. It uses the same formatting as formatDuration.
 * @param timestamp The Unix timestamp in seconds.
 * @returns A formatted duration string.
 */
export function formatTimestamp(timestamp: number, now: number): string {
  const seconds = Math.floor(now - timestamp)
  return formatDuration(seconds)
}
// frontend/src/lib/utils/time.ts

/**
 * Formats a duration in seconds into a human-readable string (e.g., "1h 2m 3s").
 * @param seconds The duration in seconds.
 * @returns A formatted string.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return "N/A"

  const y = Math.floor(seconds / (3600 * 24 * 365))
  const d = Math.floor((seconds % (3600 * 24 * 365)) / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  let timeString = ""
  if (y > 0) timeString += `${y}y `
  if (d > 0) timeString += `${d}d `
  if (h > 0) timeString += `${h}h `
  if (m > 0) timeString += `${m}m `
  if (s > 0 || timeString === "") timeString += `${s}s`

  return timeString.trim()
}
