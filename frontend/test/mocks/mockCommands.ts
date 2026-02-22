import * as fs from "fs"
import type { Server as SocketIOServer } from "socket.io"
import type { Printer } from "./kobraData"
import { mockPrinter } from "./kobraData"
import { emitPrinterUpdate } from "./kobraUnleashedMock"

export interface MockCommandContext {
  io: SocketIOServer
  printer: Printer
}

export const mockCommands: {
  [key: string]: (ctx: MockCommandContext, ...args: any[]) => void
} = {
  /**
   * Sets the printer to an `online` and `free` state.
   * If the middleware io is closed, restarts Vite server to reload everything.
   */
  online: ({ io, printer }) => {
    // After io.close() is called by connError, the underlying server is shut down.
    // We can detect this state by checking if `(io as any).server` is still available.
    if (!(io as any).server) {
      console.log(
        "📠 [Kobra Mock] Socket.IO server is closed. Restarting Vite to recover.",
      )
      // Touches the vite config file to trigger a server restart.
      const now = new Date()
      try {
        fs.utimesSync("./vite.config.ts", now, now)
      } catch (err) {
        console.error(
          "🔥 [Kobra Mock] Failed to touch vite.config.ts to trigger restart:",
          err,
        )
      }
      return
    }
    printer.online = true
    printer.state = "free"
    emitPrinterUpdate(io, printer)
  },

  /**
   * Sets the printer's `online` status to `false`, simulating a powered-off printer.
   */
  offline: ({ io, printer }) => {
    printer.online = false
    emitPrinterUpdate(io, printer)
  },

  /**
   * Simulates a complete backend failure by shutting down the mock Socket.IO server.
   * Use `mocksCtrl.online()` to recover.
   */
  connError: ({ io }) => {
    io.close()
  },

  /**
   * Sets the printer state to 'busy'.
   */
  busy: ({ io, printer }) => {
    printer.state = "busy"
    emitPrinterUpdate(io, printer)
  },
}
