// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2024-2026 Chris Suszynski (@cardil)
import fs from "fs"
import path from "path"
import {
  parseMockCommandsFromSources,
  commandSources,
} from "./mockCommandParser.mjs"

const outputPath = path.resolve(process.cwd(), "test/mocks/mockCommands.json")

console.log("Building mock commands manifest...")

try {
  const allCommands = parseMockCommandsFromSources()
  fs.writeFileSync(outputPath, `${JSON.stringify(allCommands, null, 2)}\n`)
  console.log(`✅ Mock commands manifest built successfully at ${outputPath}`)
} catch (error) {
  console.error("🔥 Failed to build mock commands manifest:", error)
  process.exit(1)
}
