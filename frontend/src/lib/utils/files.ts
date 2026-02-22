// frontend/src/lib/utils/files.ts

/**
 * Formats a file size in bytes into a human-readable string (e.g., "1.2 MB").
 * @param bytes The file size in bytes.
 * @returns A formatted string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
