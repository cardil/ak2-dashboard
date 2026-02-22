// frontend/src/lib/stores/time.ts
import { readable } from "svelte/store"

export const time = readable(Date.now(), function start(set) {
  const interval = setInterval(() => {
    set(Date.now())
  }, 1000)

  return function stop() {
    clearInterval(interval)
  }
})
