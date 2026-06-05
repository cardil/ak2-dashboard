// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2024-2026 Chris Suszynski (@cardil)
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
