// frontend/src/lib/api/profiles.ts

// --- API Data Structures ---
// These interfaces define the contract with the C backend profiles API.

export interface ProfileSettings {
  grid_size: number
  bed_temp: number
  precision: number
}

/** A slot represents any mesh data entry: active mesh or a saved slot */
export interface Slot {
  id?: number // present for saved slots; absent for active_mesh
  date?: string // present for saved slots
  mesh_data: string
  z_offset?: number // undefined = legacy slot without z_offset
}

export interface ProfileDetails {
  id: number | "current"
  name?: string // Optional for "current" profile
  settings: ProfileSettings
  active_slot: Slot
  saved_slots: Slot[]
  loaded_from?: number // Optional, indicates which profile was last applied to Current
}

export interface ProfileSummary {
  id: number
  name: string
}

export interface ProfileList {
  loaded_from?: number // Optional, indicates which profile is currently loaded
  profiles: ProfileSummary[]
}

export interface SaveAsRequest {
  target: "new" | "current" | number
  name?: string // Required only when target="new"
}

// --- API Client Functions ---

const API_BASE = "/api/profiles"

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `API Error: ${response.status} ${response.statusText} - ${errorText}`,
    )
  }
  return response.json() as Promise<T>
}

/**
 * Get list of all profiles
 */
export async function getProfiles(): Promise<ProfileList> {
  const response = await fetch(API_BASE)
  return handleResponse<ProfileList>(response)
}

/**
 * Get profile details (settings, active mesh, saved meshes)
 * @param id Profile ID (1-20) or "current" for active profile
 */
export async function getProfile(
  id: number | "current",
): Promise<ProfileDetails> {
  const response = await fetch(`${API_BASE}/${id}`)
  return handleResponse<ProfileDetails>(response)
}

/**
 * Create a new profile
 * Note: In the new API, profile creation is done via saveAs with target="new"
 */
export async function createProfile(
  sourceId: number | "current",
  name: string,
): Promise<{ status: string; message: string; id?: number }> {
  const request: SaveAsRequest = { target: "new", name }
  const response = await fetch(`${API_BASE}/${sourceId}/save-as`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  return handleResponse(response)
}

/**
 * Update profile metadata (name only)
 */
export async function updateProfile(
  id: number,
  name: string,
): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  return handleResponse(response)
}

/**
 * Delete a profile
 */
export async function deleteProfile(
  id: number,
): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
  })
  return handleResponse(response)
}

/**
 * Save profile to a target (copy operation)
 * @param sourceId Source profile ID or "current"
 * @param request Target specification
 */
export async function saveAs(
  sourceId: number | "current",
  request: SaveAsRequest,
): Promise<{ status: string; message: string; id?: number }> {
  const response = await fetch(`${API_BASE}/${sourceId}/save-as`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  return handleResponse(response)
}

/**
 * Save mesh to a profile's slot
 */
export async function saveSlot(
  profileId: number | "current",
  slotId: number,
  meshData: string,
  zOffset?: number,
): Promise<{ status: string; message: string }> {
  const body: Record<string, unknown> = { mesh_data: meshData }
  if (zOffset !== undefined) body.z_offset = zOffset
  const response = await fetch(`${API_BASE}/${profileId}/slots/${slotId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return handleResponse(response)
}

/**
 * Update only z_offset for a saved slot (partial update)
 */
export async function updateSlotZOffset(
  profileId: number | "current",
  slotId: number,
  zOffset: number,
): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE}/${profileId}/slots/${slotId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ z_offset: zOffset }),
  })
  return handleResponse(response)
}

/**
 * Delete a slot from a profile
 */
export async function deleteSlot(
  profileId: number | "current",
  slotId: number,
): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE}/${profileId}/slots/${slotId}`, {
    method: "DELETE",
  })
  return handleResponse(response)
}

/**
 * Update profile's active mesh (printer.cfg)
 */
export async function updatePrinterMesh(
  profileId: number | "current",
  meshData: string,
  zOffset?: number,
): Promise<{ status: string; message: string }> {
  const body: Record<string, unknown> = { mesh_data: meshData }
  if (zOffset !== undefined) body.z_offset = zOffset
  const response = await fetch(`${API_BASE}/${profileId}/printer-mesh`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return handleResponse(response)
}

export interface SaveSettingsResponse {
  status: string
  message: string
  grid_size_changed: boolean
}

/**
 * Update profile's settings
 */
export async function updateSettings(
  profileId: number | "current",
  settings: ProfileSettings,
  zOffset?: number | null,
): Promise<SaveSettingsResponse> {
  const body: Record<string, unknown> = {
    grid_size: settings.grid_size,
    bed_temp: settings.bed_temp,
    precision: settings.precision,
  }
  if (zOffset != null) body.z_offset = zOffset
  const response = await fetch(`${API_BASE}/${profileId}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return handleResponse<SaveSettingsResponse>(response)
}

/**
 * Update active z_offset by updating the settings (writes to printer.cfg)
 */
export async function updateActiveZOffset(
  profileId: number | "current",
  zOffset: number,
): Promise<SaveSettingsResponse> {
  const response = await fetch(`${API_BASE}/${profileId}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ z_offset: zOffset }),
  })
  return handleResponse<SaveSettingsResponse>(response)
}
