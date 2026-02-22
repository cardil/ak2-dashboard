// frontend/src/lib/dev/mockLocalCommands.ts
import { webserverStore } from "$lib/stores/webserver"
import { pushState } from "$app/navigation"

export const localMockCommands: { [key: string]: (...args: any[]) => void } = {
  /**
   * Simulates an unconfigured frontend by clearing the API URL
   * without reloading the page.
   */
  unconfigured: () => {
    const url = new URL(window.location.href)
    url.searchParams.set("api_url", "")
    pushState(url.href, {})

    // Force re-initialization of the store with the new URL parameters
    webserverStore.reinitialize()
  },
}
