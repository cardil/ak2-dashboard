import type { ViteDevServer } from "vite"
import type { Server as SocketIOServer } from "socket.io"
import type { Printer } from "./kobraData"
import { mockCommands, type MockCommandContext } from "./mockCommands"
import fs from "fs"
import path from "path"
import { parseMockCommandsFromSources } from "./mockCommandParser.mjs"

export function initializeHmrBridge(
  server: ViteDevServer,
  io: SocketIOServer,
  printer: Printer,
) {
  const mockContext: MockCommandContext = { io, printer }
  let commandsWithDocs: { name: string; description: string }[] = []

  // Attempt to load pre-built commands, with a fallback to parsing the source.
  try {
    const commandsJsonPath = path.resolve(
      process.cwd(),
      "test/mocks/mockCommands.json",
    )
    const fileContents = fs.readFileSync(commandsJsonPath, "utf8")
    commandsWithDocs = JSON.parse(fileContents)
    console.log("✅ [HMR Bridge] Mock commands manifest loaded successfully.")
  } catch (error) {
    console.warn(
      "⚠️ [HMR Bridge] Could not load mock commands manifest. Falling back to live parsing.",
    )
    try {
      commandsWithDocs = parseMockCommandsFromSources()
      console.log("✅ [HMR Bridge] Mock commands parsed live successfully.")
    } catch (parseError) {
      console.error(
        "🔥 [HMR Bridge] CRITICAL: Failed to load and parse mock commands.",
        parseError,
      )
    }
  }

  server.ws.on("mock:run-command", (data) => {
    const { command, args } = data
    if (mockCommands[command]) {
      mockCommands[command](mockContext, ...args)
    } else {
      console.warn(`[Kobra Mock] Received unknown command: ${command}`)
    }
  })

  server.ws.on("mock:get-commands", () => {
    server.ws.send({
      type: "custom",
      event: "mock:commands-list",
      data: { commands: commandsWithDocs },
    })
  })
}
