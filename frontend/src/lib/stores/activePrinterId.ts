import { writable } from "svelte/store"

function createActivePrinterIdStore() {
  const { subscribe, set } = writable<string | null>(null)

  return {
    subscribe,
    select: (id: string) => set(id),
  }
}

export const activePrinterIdStore = createActivePrinterIdStore()
