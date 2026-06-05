// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2024-2026 Chris Suszynski (@cardil)
import { writable } from "svelte/store"

function createActivePrinterIdStore() {
  const { subscribe, set } = writable<string | null>(null)

  return {
    subscribe,
    select: (id: string) => set(id),
  }
}

export const activePrinterIdStore = createActivePrinterIdStore()
