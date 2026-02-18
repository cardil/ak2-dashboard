import { writable } from "svelte/store"
import { browser } from "$app/environment"

export interface SystemInfo {
  api_ver: number
  total_mem: number
  free_mem: number
  free_mem_per: number
  cpu_use: number
  cpu_usr_use: number
  cpu_sys_use: number
  cpu_idle: number
  ssh_status: number
  uptime: string
}

function createSystemInfoStore() {
  const { subscribe, set } = writable<SystemInfo | null>(null)
  let interval: NodeJS.Timeout | null = null

  async function fetchSystemInfo() {
    if (!browser) return
    try {
      const response = await fetch("/api/system")
      if (response.ok) {
        const data = await response.json()
        set(data)
      } else {
        set(null)
      }
    } catch (error) {
      console.error("Error fetching system info:", error)
      set(null)
    }
  }

  if (browser) {
    fetchSystemInfo()
    interval = setInterval(fetchSystemInfo, 5000) // Refresh every 5 seconds
  }

  return {
    subscribe,
    forceUpdate: fetchSystemInfo,
    stop: () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    },
  }
}

export const systemInfo = createSystemInfoStore()
