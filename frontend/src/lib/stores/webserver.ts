import { writable, get } from "svelte/store"
import { browser } from "$app/environment"

export interface WebserverConfig {
  printer_model: string
  update_version: string
  mqtt_webui_url: string
}

function createWebserverStore() {
  const store = writable<WebserverConfig | null>(null)

  async function fetchConfig() {
    try {
      let url = "/api/webserver"
      if (browser) {
        const params = new URLSearchParams(window.location.search)
        if (params.has("api_url")) {
          url += `?api_url=${params.get("api_url")}`
        }
      }
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Failed to fetch webserver config")
      }
      const config = await response.json()
      store.set(config)
    } catch (error) {
      console.error("Error fetching webserver config:", error)
      store.set(null) // Explicitly set to null on error
    }
  }

  function reinitialize() {
    fetchConfig()
  }

  if (browser) {
    fetchConfig()
  }

  return {
    subscribe: store.subscribe,
    get: () => get(store),
    reinitialize,
  }
}

export const webserverStore = createWebserverStore()
