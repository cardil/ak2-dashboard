/**
 * Check if content is binary by looking for NULL bytes and invalid UTF-8
 */
export function isBinaryContent(buffer: Uint8Array): boolean {
  // Check for NULL bytes - definitive binary indicator
  if (buffer.includes(0)) return true

  // Try UTF-8 decoding
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true })
    decoder.decode(buffer)

    // Count control characters (excluding \t, \n, \r)
    let controlChars = 0
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i]
      if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) {
        controlChars++
      }
    }

    // If >1% are control chars, treat as binary
    return controlChars / buffer.length > 0.01
  } catch {
    // UTF-8 decoding failed - it's binary
    return true
  }
}

/**
 * Generate hex dump string from binary data
 */
export function generateHexDump(buffer: Uint8Array): string {
  const lines: string[] = []
  const bytesPerLine = 16

  for (let offset = 0; offset < buffer.length; offset += bytesPerLine) {
    const chunk = buffer.slice(offset, offset + bytesPerLine)

    // Offset (8 hex digits)
    const offsetStr = offset.toString(16).padStart(8, "0")

    // Hex bytes (split into two groups of 8)
    const hexBytes: string[] = []
    for (let i = 0; i < bytesPerLine; i++) {
      if (i < chunk.length) {
        hexBytes.push(chunk[i].toString(16).padStart(2, "0"))
      } else {
        hexBytes.push("  ")
      }
    }
    const hex1 = hexBytes.slice(0, 8).join(" ")
    const hex2 = hexBytes.slice(8, 16).join(" ")

    // ASCII representation
    const ascii = Array.from(chunk)
      .map((byte) => {
        // Printable ASCII (32-126)
        if (byte >= 0x20 && byte <= 0x7e) {
          return String.fromCharCode(byte)
        }
        return "."
      })
      .join("")
      .padEnd(bytesPerLine, " ")

    // Format: offset  hex1  hex2  |ascii|
    lines.push(`${offsetStr}  ${hex1}  ${hex2}  |${ascii}|`)
  }

  return lines.join("\n")
}
