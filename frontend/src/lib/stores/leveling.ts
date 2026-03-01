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

/** Slot represents any mesh data entry: active, saved, or average */
export interface Slot {
  id: number | "active" | "average"
  name: string
  date?: string
  data: number[][]
  zOffset?: number // undefined = legacy/unknown, number = known z_offset
}

export interface LevelingStore {
  settings?: LevelingSettings
  activeSlot?: Slot
  savedSlots: Slot[]
  averageSlot?: Slot
  isLoading: boolean // For the initial page load
  isUpdating: boolean // For background updates after an action
  rebootNeeded: boolean
  error?: string
}

// --- Helper Functions ---

/**
 * Parses a flat mesh string (e.g., "0.1, 0.2, 0.3...") into a 2D number array.
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
 * Calculates the average slot from a list of saved slots.
 * Only slots that have z_offset contribute to the z_offset average.
 */
function calculateAverageSlot(
  slots: Slot[],
  gridSize: number,
  precision: number = 0.01,
): Slot | undefined {
  if (slots.length === 0) return undefined

  const avgData = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(0),
  )
  for (const slot of slots) {
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        avgData[i][j] += slot.data[i][j]
      }
    }
  }
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      avgData[i][j] /= slots.length
    }
  }

  applyPrecision(avgData, precision)

  // Average z_offset only from slots that have it; undefined if none do
  const withZ = slots.filter((s) => s.zOffset !== undefined)
  const avgZOffset =
    withZ.length > 0
      ? withZ.reduce((acc, s) => acc + s.zOffset!, 0) / withZ.length
      : undefined

  return { id: "average", name: "Average", data: avgData, zOffset: avgZOffset }
}

// --- Store ---

function createLevelingStore() {
  const { subscribe, set, update } = writable<LevelingStore>({
    savedSlots: [],
    isLoading: true,
    isUpdating: false,
    rebootNeeded: false,
  })

  async function fetchData(initial = false) {
    if (initial) {
      update((s) => ({ ...s, isLoading: true, error: undefined }))
    } else {
      update((s) => ({ ...s, isUpdating: true, error: undefined }))
    }

    try {
      const selectedProfile = get(profilesStore).selectedProfile
      const status = await api.getProfile(selectedProfile)
      const gridSize = status.settings.grid_size

      const activeSlot: Slot = {
        id: "active",
        name: "Active",
        data: parseMeshString(status.active_slot.mesh_data, gridSize),
        zOffset: status.active_slot.z_offset,
      }

      const savedSlots: Slot[] = status.saved_slots.map((sm) => ({
        id: sm.id!,
        name: `Slot ${sm.id}`,
        date: sm.date,
        data: parseMeshString(sm.mesh_data, gridSize),
        zOffset: sm.z_offset,
      }))

      const precision = status.settings.precision
      const averageSlot = calculateAverageSlot(savedSlots, gridSize, precision)

      set({
        ...get(levelingStore),
        settings: {
          gridSize: status.settings.grid_size,
          bedTemp: status.settings.bed_temp,
          precision: status.settings.precision,
        },
        activeSlot,
        savedSlots,
        averageSlot,
        isLoading: false,
        isUpdating: false,
        error: undefined,
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
      await fetchData()
    } catch (e: any) {
      update((s) => ({
        ...s,
        isUpdating: false,
        error: e.message || `Failed to delete slot ${slotId}.`,
      }))
      throw e
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
      const apiSettings: api.ProfileSettings = {
        grid_size: settings.gridSize,
        bed_temp: settings.bedTemp,
        precision: settings.precision,
      }
      const response = await api.updateSettings(selectedProfile, apiSettings)

      if (response.grid_size_changed && selectedProfile === "current") {
        update((s) => ({ ...s, rebootNeeded: true }))
      }

      if (
        precisionChanged &&
        currentStore.savedSlots.length > 0 &&
        currentStore.settings
      ) {
        const newAverageSlot = calculateAverageSlot(
          currentStore.savedSlots,
          currentStore.settings.gridSize,
          settings.precision,
        )
        update((s) => ({ ...s, averageSlot: newAverageSlot }))
      }

      await fetchData()
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
      if (!store.activeSlot) {
        throw new Error("No active mesh to save")
      }
      const meshData = store.activeSlot.data.flat().join(", ")
      await api.saveSlot(
        selectedProfile,
        slotId,
        meshData,
        store.activeSlot.zOffset,
      )
      await fetchData()
    } catch (e: any) {
      update((s) => ({
        ...s,
        isUpdating: false,
        error: e.message || `Failed to save mesh to slot ${slotId}.`,
      }))
      throw e
    }
  }

  async function saveEditedMesh(slotId: number, editedData: number[][]) {
    update((s) => ({ ...s, isUpdating: true }))
    try {
      const selectedProfile = get(profilesStore).selectedProfile
      const store = get(levelingStore)
      const existingSlot = store.savedSlots.find((s) => s.id === slotId)
      const meshData = editedData.flat().join(", ")
      await api.saveSlot(
        selectedProfile,
        slotId,
        meshData,
        existingSlot?.zOffset,
      )
      await fetchData()
    } catch (e: any) {
      update((s) => ({
        ...s,
        isUpdating: false,
        error: e.message || `Failed to save edited mesh to slot ${slotId}.`,
      }))
      throw e
    }
  }

  async function activateSlot(slotId: number) {
    update((s) => ({ ...s, isUpdating: true }))
    try {
      const selectedProfile = get(profilesStore).selectedProfile
      const store = get(levelingStore)
      const slot = store.savedSlots.find((s) => s.id === slotId)
      if (!slot) {
        throw new Error(`Slot ${slotId} not found`)
      }
      const meshData = slot.data.flat().join(", ")
      await api.updatePrinterMesh(selectedProfile, meshData, slot.zOffset)
      await fetchData()
    } catch (e: any) {
      update((s) => ({
        ...s,
        isUpdating: false,
        error: e.message || `Failed to activate slot ${slotId}.`,
      }))
      throw e
    }
  }

  async function deleteAllSlots() {
    update((s) => ({ ...s, isUpdating: true }))
    try {
      const selectedProfile = get(profilesStore).selectedProfile
      const store = get(levelingStore)
      const deletePromises = store.savedSlots.map((slot) => {
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
      throw e
    }
  }

  async function activateAverageMesh() {
    const store = get(levelingStore)
    if (store.averageSlot) {
      update((s) => ({ ...s, isUpdating: true }))
      try {
        const selectedProfile = get(profilesStore).selectedProfile
        await api.updatePrinterMesh(
          selectedProfile,
          store.averageSlot.data.flat().join(", "),
          store.averageSlot.zOffset,
        )
        await fetchData()
      } catch (e: any) {
        update((s) => ({
          ...s,
          isUpdating: false,
          error: e.message || "Failed to activate average mesh.",
        }))
        throw e
      }
    }
  }

  /**
   * Update z_offset for a slot.
   * - Active slot ("active"): updates via settings API (writes to printer.cfg)
   * - Saved slot (number): partial update via slot API (writes line 2 of .txt file)
   */
  async function updateZOffset(slotId: number | "active", newZOffset: number) {
    update((s) => ({ ...s, isUpdating: true }))
    try {
      const selectedProfile = get(profilesStore).selectedProfile
      if (slotId === "active") {
        await api.updateActiveZOffset(selectedProfile, newZOffset)
      } else {
        await api.updateSlotZOffset(selectedProfile, slotId, newZOffset)
      }
      await fetchData()
    } catch (e: any) {
      update((s) => ({
        ...s,
        isUpdating: false,
        error: e.message || `Failed to update z_offset for slot ${slotId}.`,
      }))
      throw e
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
    updateZOffset,
  }
}

export const levelingStore = createLevelingStore()
