import { writable, readable, get } from "svelte/store"
import { browser } from "$app/environment"

export type Theme = "auto" | "light" | "dark"
export type EffectiveTheme = "light" | "dark"

const defaultValue: Theme = "auto"
const initialValue = browser
  ? ((window.localStorage.getItem("theme") as Theme) ?? defaultValue)
  : defaultValue

// This store holds the user's explicit preference ('auto', 'light', 'dark')
export const theme = writable<Theme>(initialValue)

theme.subscribe((value) => {
  if (browser) {
    window.localStorage.setItem("theme", value)
  }
})

// This derived store always resolves to the actual theme being used ('light' or 'dark')
export const effectiveTheme = readable<EffectiveTheme>("light", (set) => {
  if (!browser) return

  // 1. Initialize the media query object first
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

  // 2. Define the update function
  function update() {
    const userPreference = get(theme)
    const prefersDark = mediaQuery.matches

    if (userPreference === "auto") {
      set(prefersDark ? "dark" : "light")
    } else {
      set(userPreference)
    }
  }

  // 3. Attach listeners
  mediaQuery.addEventListener("change", update)
  const unsubscribeFromTheme = theme.subscribe(update)

  // 4. Run once to set the initial theme
  update()

  // Cleanup
  return () => {
    mediaQuery.removeEventListener("change", update)
    unsubscribeFromTheme()
  }
})
