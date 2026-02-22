// frontend/src/lib/stores/kobraConnection.ts
import { writable } from "svelte/store"

export type KobraConnectionStatus =
  | "initializing"
  | "connecting"
  | "connected"
  | "error"
  | "unavailable"

export const kobraConnectionStore =
  writable<KobraConnectionStatus>("initializing")
