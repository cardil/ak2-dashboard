// frontend/src/lib/dev/mockProxy.ts
import { browser } from "$app/environment"
import { localMockCommands } from "./mockLocalCommands"
import { webserverStore } from "$lib/stores/webserver"
import { pushState } from "$app/navigation"

export function initializeMockProxy() {
  if (!browser || !import.meta.hot) {
    return
  }

  const sendToServer = (command: string, ...args: any[]) => {
    if (import.meta.hot) {
      import.meta.hot.send("mock:run-command", { command, args })
    }
  }

  // Helper to create hybrid commands that first ensure the mock server is targeted,
  // then proxy a command to the server.
  const ensureConfiguredAndProxy = (command: string) => {
    return () => {
      // 1. Ensure the frontend is configured to use the mock server.
      // In development, the absence of an 'api_url' query parameter
      // defaults the connection to the integrated mock server.
      const url = new URL(window.location.href)
      if (url.searchParams.has("api_url")) {
        url.searchParams.delete("api_url")
        pushState(url.href, {})
        // Re-initialize stores to use the new (default) API URL.
        webserverStore.reinitialize()
      }

      // 2. Trigger the corresponding server-side command.
      sendToServer(command)
    }
  }

  // 1. Listen for the list of commands from the server
  import.meta.hot.on("mock:commands-list", ({ commands }) => {
    const mocksCtrl: { [key: string]: Function } = {}
    const helpData: { [key: string]: string } = {}

    // 2. Build the client-side command registry
    const clientCommands = {
      ...localMockCommands,
      online: ensureConfiguredAndProxy("online"),
      connError: ensureConfiguredAndProxy("connError"),
    }

    // 3. Create proxy functions for all commands, prioritizing client-side implementations.
    commands.forEach((cmd: { name: string; description: string }) => {
      const commandName = cmd.name
      if (clientCommands[commandName as keyof typeof clientCommands]) {
        mocksCtrl[commandName] =
          clientCommands[commandName as keyof typeof clientCommands]
      } else {
        mocksCtrl[commandName] = (...args: any[]) =>
          sendToServer(commandName, ...args)
      }
      helpData[commandName] = cmd.description
    })

    // 4. Add a help function and its description
    helpData["help"] = "Displays this help message."
    mocksCtrl.help = () => {
      console.log("🧪 Available Mock Controls:")
      // Sort the help data alphabetically by command name before displaying
      const sortedHelp = Object.fromEntries(Object.entries(helpData).sort())
      console.table(sortedHelp)
    }

    // 5. Expose the proxy on the window
    ;(window as any).mocksCtrl = mocksCtrl

    // 6. Log the dynamic help message
    const availableCommands = Object.keys(mocksCtrl)
      .sort()
      .map((cmd) => `  - mocksCtrl.${cmd}()`)
      .join("\n")
    console.log(
      `🧪 Mock controls are available as \`mocksCtrl\`. Try:\n${availableCommands}`,
    )
  })

  // 1a. Request the list of commands on startup
  import.meta.hot.send("mock:get-commands", {})
}
