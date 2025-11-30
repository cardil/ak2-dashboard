import { get, writable } from "svelte/store"
import { browser } from "$app/environment"
import * as api from "$lib/api/profiles"
import { profilesStore } from "$lib/stores/profiles"

// --- Types ---

export interface LevelingSettings {
  gridSize: number
  bedTemp: number
  precision: number
}

export interface MeshProfile {
  id: number | "active" | "average"
  name: string
  date?: string
  data: number[][]
  zOffset?: number // Only for the active mesh
}

export interface LevelingStore {
  settings: LevelingSettings | null
  activeMesh: MeshProfile | null
  savedMeshes: MeshProfile[]
  averageMesh: MeshProfile | null
  isLoading: boolean // For the initial page load
  isUpdating: boolean // For background updates after an action
  rebootNeeded: boolean
  error: string | null
}

// --- Helper Functions ---

/**
 * Parses a flat mesh string (e.g., "0.1, 0.2, 0.3...") into a 2D number array.
 * @param meshString The raw mesh data string.
 * @param gridSize The size of the grid (e.g., 5 for a 5x5 mesh).
 * @returns A 2D array of numbers representing the mesh.
 */
function parseMeshString(meshString: string, gridSize: number): number[][] {
  const flatData = meshString.split(",").map((s) => parseFloat(s.trim()))
  const grid: number[][] = []
  for (let i = 0; i < gridSize; i++) {
    grid.push(flatData.slice(i * gridSize, (i + 1) * gridSize))
  }
  return grid
}

/**
 * Applies precision rounding to mesh data, matching the C backend's apply_precision function.
 * @param meshData 2D array of mesh values.
 * @param precision The precision value (e.g., 0.01 means round to nearest 0.01).
 */
function applyPrecision(meshData: number[][], precision: number): void {
  if (precision === 0.0) return

  for (let i = 0; i < meshData.length; i++) {
    for (let j = 0; j < meshData[i].length; j++) {
      meshData[i][j] = Math.round(meshData[i][j] / precision) * precision
    }
  }
}

/**
 * Calculates the average of a list of saved mesh profiles.
 * @param meshes An array of saved mesh profiles.
 * @param gridSize The size of the grid.
 * @param precision The precision value to apply to the averaged mesh (default: 0.01).
 * @returns A new MeshProfile representing the average, or null if no meshes are provided.
 */
function calculateAverageMesh(
  meshes: MeshProfile[],
  gridSize: number,
  precision: number = 0.01,
): MeshProfile | null {
  if (meshes.length === 0) return null

  const avgData = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(0),
  )
  for (const mesh of meshes) {
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        avgData[i][j] += mesh.data[i][j]
      }
    }
  }

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      avgData[i][j] = avgData[i][j] / meshes.length
    }
  }

  // Apply precision rounding, matching the C backend behavior
  applyPrecision(avgData, precision)

  return { id: "average", name: "Average", data: avgData }
}

// --- Store ---

function createLevelingStore() {
  const { subscribe, set, update } = writable<LevelingStore>({
    settings: null,
    activeMesh: null,
    savedMeshes: [],
    averageMesh: null,
    isLoading: true,
    isUpdating: false,
    rebootNeeded: false,
    error: null,
  })

  async function fetchData(initial = false) {
    if (initial) {
      update((s) => ({ ...s, isLoading: true, error: null }))
    } else {
      update((s) => ({ ...s, isUpdating: true, error: null }))
    }

    try {
      const selectedProfile = get(profilesStore).selectedProfile
      const status = await api.getProfile(selectedProfile)
      const gridSize = status.settings.grid_size

      const activeMesh: MeshProfile = {
        id: "active",
        name: "Active",
        data: parseMeshString(status.active_mesh.mesh_data, gridSize),
        zOffset: status.settings.z_offset, // z_offset comes from settings in the C backend
      }

      const savedMeshes: MeshProfile[] = status.saved_meshes.map((sm) => ({
        id: sm.id,
        name: `Slot ${sm.id}`,
        date: sm.date,
        data: parseMeshString(sm.mesh_data, gridSize),
      }))

      const precision = status.settings.precision
      const averageMesh = calculateAverageMesh(savedMeshes, gridSize, precision)

      set({
        ...get(levelingStore), // Preserve existing state like rebootNeeded
        settings: {
          gridSize: status.settings.grid_size,
          bedTemp: status.settings.bed_temp,
          precision: status.settings.precision,
        },
        activeMesh,
        savedMeshes,
        averageMesh,
        isLoading: false,
        isUpdating: false,
        error: null,
      })
    } catch (e: any) {
      update((s) => ({
        ...s,
        isLoading: false,
        isUpdating: false,
        error: e.message || "Failed to fetch leveling data.",
      }))
    }
  }

  async function deleteSlot(slotId: number) {
    update((s) => ({ ...s, isUpdating: true }))
    try {
      const selectedProfile = get(profilesStore).selectedProfile
      await api.deleteSlot(selectedProfile, slotId)
      await fetchData() // Refetch data to update the state
    } catch (e: any) {
      update((s) => ({
        ...s,
        isUpdating: false,
        error: e.message || `Failed to delete slot ${slotId}.`,
      }))
    }
  }

  async function saveSettings(
    settings: LevelingSettings,
  ): Promise<api.SaveSettingsResponse> {
    const currentStore = get(levelingStore)
    const precisionChanged =
      currentStore.settings?.precision !== settings.precision

    update((s) => ({ ...s, isUpdating: true }))
    try {
      const selectedProfile = get(profilesStore).selectedProfile
      const apiSettings: Omit<api.ProfileSettings, "z_offset"> = {
        grid_size: settings.gridSize,
        bed_temp: settings.bedTemp,
        precision: settings.precision,
      }
      const response = await api.updateSettings(selectedProfile, apiSettings)

      if (response.grid_size_changed) {
        update((s) => ({ ...s, rebootNeeded: true }))
      }

      // If precision changed, recalculate average mesh immediately if we have saved meshes
      if (
        precisionChanged &&
        currentStore.savedMeshes.length > 0 &&
        currentStore.settings
      ) {
        const newAverageMesh = calculateAverageMesh(
          currentStore.savedMeshes,
          currentStore.settings.gridSize,
          settings.precision,
        )
        update((s) => ({ ...s, averageMesh: newAverageMesh }))
      }

      await fetchData() // Refetch data to update the state
      return response
    } catch (e: any) {
      update((s) => ({
        ...s,
        isUpdating: false,
        error: e.message || "Failed to save settings.",
      }))
      throw e
    }
  }

  async function saveActiveMesh(slotId: number) {
    update((s) => ({ ...s, isUpdating: true }))
    try {
      const selectedProfile = get(profilesStore).selectedProfile
      const store = get(levelingStore)
      if (!store.activeMesh) {
        throw new Error("No active mesh to save")
      }
      const meshData = store.activeMesh.data.flat().join(", ")
      await api.saveSlot(selectedProfile, slotId, meshData)
      await fetchData()
    } catch (e: any) {
      update((s) => ({
        ...s,
        isUpdating: false,
        error: e.message || `Failed to save mesh to slot ${slotId}.`,
      }))
    }
  }

  async function saveEditedMesh(slotId: number, editedData: number[][]) {
    update((s) => ({ ...s, isUpdating: true }))
    try {
      const selectedProfile = get(profilesStore).selectedProfile
      const meshData = editedData.flat().join(", ")
      await api.saveSlot(selectedProfile, slotId, meshData) // Re-use the same API endpoint
      await fetchData()
    } catch (e: any) {
      update((s) => ({
        ...s,
        isUpdating: false,
        error: e.message || `Failed to save edited mesh to slot ${slotId}.`,
      }))
    }
  }

  async function activateSlot(slotId: number) {
    update((s) => ({ ...s, isUpdating: true }))
    try {
      const selectedProfile = get(profilesStore).selectedProfile
      const store = get(levelingStore)
      const slot = store.savedMeshes.find((s) => s.id === slotId)
      if (!slot) {
        throw new Error(`Slot ${slotId} not found`)
      }
      const meshData = slot.data.flat().join(", ")
      await api.updatePrinterMesh(selectedProfile, meshData)
      await fetchData()
    } catch (e: any) {
      update((s) => ({
        ...s,
        isUpdating: false,
        error: e.message || `Failed to activate slot ${slotId}.`,
      }))
    }
  }

  async function deleteAllSlots() {
    update((s) => ({ ...s, isUpdating: true }))
    try {
      const selectedProfile = get(profilesStore).selectedProfile
      const store = get(levelingStore)
      // Delete all slots individually since the backend doesn't support bulk delete
      const deletePromises = store.savedMeshes.map((slot) => {
        if (typeof slot.id === "number") {
          return api.deleteSlot(selectedProfile, slot.id)
        }
        return Promise.resolve()
      })
      await Promise.all(deletePromises)
      await fetchData()
    } catch (e: any) {
      update((s) => ({
        ...s,
        isUpdating: false,
        error: e.message || "Failed to delete all slots.",
      }))
    }
  }

  async function activateAverageMesh() {
    const store = get(levelingStore)
    if (store.averageMesh) {
      update((s) => ({ ...s, isUpdating: true }))
      try {
        const selectedProfile = get(profilesStore).selectedProfile
        await api.updatePrinterMesh(
          selectedProfile,
          store.averageMesh.data.flat().join(", "),
        )
        await fetchData()
      } catch (e: any) {
        update((s) => ({
          ...s,
          isUpdating: false,
          error: e.message || "Failed to activate average mesh.",
        }))
      }
    }
  }

  if (browser) {
    fetchData(true)
  }

  return {
    subscribe,
    fetchData,
    deleteSlot,
    saveSettings,
    saveActiveMesh,
    saveEditedMesh,
    activateSlot,
    deleteAllSlots,
    activateAverageMesh,
  }
}

export const levelingStore = createLevelingStore()
