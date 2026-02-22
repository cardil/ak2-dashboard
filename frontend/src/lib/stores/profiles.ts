import { writable, get } from "svelte/store"
import { browser } from "$app/environment"
import * as api from "$lib/api/profiles"
import type { ProfileSummary, ProfileList } from "$lib/api/profiles"

// --- Types ---

export interface ProfilesStore {
  selectedProfile: number | "current"
  loadedFrom: number | null
  profiles: ProfileSummary[]
  isLoading: boolean
  error: string | null
}

// --- Store ---

function createProfilesStore() {
  const { subscribe, set, update } = writable<ProfilesStore>({
    selectedProfile: "current",
    loadedFrom: null,
    profiles: [],
    isLoading: true,
    error: null,
  })

  async function fetchProfiles() {
    update((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const data: ProfileList = await api.getProfiles()
      update((s) => ({
        ...s,
        profiles: data.profiles,
        loadedFrom: data.loaded_from ?? null,
        isLoading: false,
        error: null,
      }))
    } catch (e: any) {
      update((s) => ({
        ...s,
        isLoading: false,
        error: e.message || "Failed to fetch profiles.",
      }))
    }
  }

  async function createProfile(
    sourceId: number | "current",
    name: string,
  ): Promise<void> {
    try {
      const response = await api.createProfile(sourceId, name)
      if (response.id) {
        // Successfully created, refetch profiles
        await fetchProfiles()
      }
    } catch (e: any) {
      throw new Error(e.message || "Failed to create profile.")
    }
  }

  async function updateProfile(id: number, name: string): Promise<void> {
    try {
      await api.updateProfile(id, name)
      // Update the profile in the local list
      update((s) => ({
        ...s,
        profiles: s.profiles.map((p) => (p.id === id ? { ...p, name } : p)),
      }))
    } catch (e: any) {
      throw new Error(e.message || "Failed to update profile.")
    }
  }

  async function deleteProfile(id: number): Promise<void> {
    try {
      await api.deleteProfile(id)
      // Remove the profile from the local list
      update((s) => {
        const newState = {
          ...s,
          profiles: s.profiles.filter((p) => p.id !== id),
        }
        // If we deleted the loaded_from profile, clear it
        if (s.loadedFrom === id) {
          newState.loadedFrom = null
        }
        // If we deleted the selected profile, switch to current
        if (s.selectedProfile === id) {
          newState.selectedProfile = "current"
        }
        return newState
      })
    } catch (e: any) {
      throw new Error(e.message || "Failed to delete profile.")
    }
  }

  async function saveAs(
    sourceId: number | "current",
    target: "new" | "current" | number,
    name?: string,
  ): Promise<void> {
    try {
      const request: api.SaveAsRequest = { target, name }
      const response = await api.saveAs(sourceId, request)

      // If we created a new profile, refetch the list
      if (target === "new" || typeof target === "number") {
        await fetchProfiles()
      }

      // If we applied to current, update loadedFrom
      if (target === "current" && typeof sourceId === "number") {
        update((s) => ({ ...s, loadedFrom: sourceId }))
      }
    } catch (e: any) {
      throw new Error(e.message || "Failed to save profile.")
    }
  }

  function selectProfile(profileId: number | "current") {
    update((s) => ({ ...s, selectedProfile: profileId }))
  }

  // Initialize on browser load
  if (browser) {
    fetchProfiles()
  }

  return {
    subscribe,
    fetchProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    saveAs,
    selectProfile,
  }
}

export const profilesStore = createProfilesStore()
