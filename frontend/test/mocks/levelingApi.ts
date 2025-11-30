import type { Connect } from "vite"

// This file will mock the C backend API for profiles.
// It provides data structures and functions that simulate the
// responses from the C API, allowing for independent frontend development.

export interface ProfileSettings {
  grid_size: number
  bed_temp: number
  precision: number
  z_offset: number // z_offset is returned in settings by the C backend
}

export interface MeshData {
  mesh_data: string
}

export interface SavedMesh {
  id: number
  date: string
  mesh_data: string
}

export interface ProfileDetails {
  id: number | "current"
  name?: string // Optional for "current" profile
  settings: ProfileSettings
  active_mesh: MeshData
  saved_meshes: SavedMesh[]
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

// Function to generate dynamic mesh data for slopes
type SlopeDirection =
  | "x-positive"
  | "x-negative"
  | "y-positive"
  | "y-negative"
  | "flat"

function generateSlopedMeshData(
  gridSize: number,
  direction: SlopeDirection = "y-positive",
): string {
  const mesh: number[][] = []
  for (let i = 0; i < gridSize; i++) {
    const row: number[] = []
    for (let j = 0; j < gridSize; j++) {
      let value = 0
      const curve = Math.sin((i / (gridSize - 1)) * Math.PI) * 0.02 // Gentle sine curve

      switch (direction) {
        case "x-positive":
          value = -0.05 + (0.1 / (gridSize - 1)) * i + curve
          break
        case "x-negative":
          value = 0.05 - (0.1 / (gridSize - 1)) * i + curve
          break
        case "y-positive":
          value = -0.05 + (0.1 / (gridSize - 1)) * j + curve
          break
        case "y-negative":
          value = 0.05 - (0.1 / (gridSize - 1)) * j + curve
          break
        case "flat":
        default:
          value = 0.01 // A simple flat mesh for contrast
          break
      }
      row.push(value)
    }
    mesh.push(row)
  }
  return mesh
    .flat()
    .map((v) => v.toFixed(6))
    .join(", ")
}

// Mock data based on the C API structure
const mockCurrentProfile: ProfileDetails = {
  id: "current",
  loaded_from: 1, // Indicates this was loaded from profile 1
  settings: {
    grid_size: 5,
    bed_temp: 60,
    precision: 0.01,
    z_offset: 1.443, // z_offset is in settings
  },
  active_mesh: {
    mesh_data: generateSlopedMeshData(5, "y-positive"),
  },
  saved_meshes: [
    {
      id: 1,
      date: "2025-11-12 10:30:00",
      mesh_data: generateSlopedMeshData(5, "x-positive"),
    },
    {
      id: 2,
      date: "2025-11-11 15:45:00",
      mesh_data: generateSlopedMeshData(5, "x-negative"),
    },
    {
      id: 3,
      date: "2025-11-12 10:30:00",
      mesh_data: generateSlopedMeshData(5, "y-positive"),
    },
    {
      id: 4,
      date: "2025-11-11 15:45:00",
      mesh_data: generateSlopedMeshData(5, "y-negative"),
    },
    {
      id: 10,
      date: "2025-11-12 22:45:00",
      mesh_data: generateSlopedMeshData(5, "flat"),
    },
  ],
}

const mockProfileList: ProfileList = {
  loaded_from: 1,
  profiles: [
    { id: 1, name: "PLA - Spring Steel Plate" },
    { id: 2, name: "PETG - Textured Plate" },
    { id: 3, name: "Profile 3" },
  ],
}

// --- Mock API Functions ---

export async function getProfiles(): Promise<ProfileList> {
  console.log("Mock API: Fetching profile list")
  return new Promise((resolve) =>
    setTimeout(() => resolve(mockProfileList), 500),
  )
}

export async function getProfile(
  id: number | "current",
): Promise<ProfileDetails> {
  console.log(`Mock API: Fetching profile ${id}`)
  return new Promise((resolve) =>
    setTimeout(() => resolve(mockCurrentProfile), 500),
  )
}

export async function deleteSlot(
  profileId: number | "current",
  slotId: number,
): Promise<{ status: string; message: string }> {
  console.log(`Mock API: Deleting slot ${slotId} from profile ${profileId}`)
  const index = mockCurrentProfile.saved_meshes.findIndex(
    (mesh) => mesh.id === slotId,
  )
  if (index !== -1) {
    mockCurrentProfile.saved_meshes.splice(index, 1)
    return new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            status: "success",
            message: `Mesh slot ${slotId} deleted.`,
          }),
        500,
      ),
    )
  } else {
    return new Promise((resolve) =>
      setTimeout(
        () => resolve({ status: "error", message: "Slot not found." }),
        500,
      ),
    )
  }
}

export interface SaveSettingsResponse {
  status: string
  message: string
  grid_size_changed: boolean
}

export async function updateSettings(
  profileId: number | "current",
  settings: Omit<ProfileSettings, "z_offset">,
): Promise<SaveSettingsResponse> {
  console.log(`Mock API: Updating settings for profile ${profileId}`, settings)
  let gridSizeChanged = false
  if (settings.grid_size !== mockCurrentProfile.settings.grid_size) {
    gridSizeChanged = true
    mockCurrentProfile.saved_meshes = []
    const newSize = settings.grid_size * settings.grid_size
    mockCurrentProfile.active_mesh.mesh_data = Array(newSize)
      .fill("0.000000")
      .join(", ")
  }
  // Update settings but preserve z_offset (it's read-only)
  mockCurrentProfile.settings = {
    ...settings,
    z_offset: mockCurrentProfile.settings.z_offset,
  }

  const response: SaveSettingsResponse = {
    status: "success",
    message: "Settings saved.",
    grid_size_changed: gridSizeChanged,
  }
  return new Promise((resolve) => setTimeout(() => resolve(response), 500))
}

export async function saveSlot(
  profileId: number | "current",
  slotId: number,
  meshData: string,
): Promise<{ status: string; message: string }> {
  console.log(`Mock API: Saving mesh to slot ${slotId} in profile ${profileId}`)
  if (!mockCurrentProfile.active_mesh) {
    return new Promise((resolve) =>
      setTimeout(
        () => resolve({ status: "error", message: "No active mesh to save." }),
        500,
      ),
    )
  }
  const existingSlot = mockCurrentProfile.saved_meshes.find(
    (mesh) => mesh.id === slotId,
  )
  if (existingSlot) {
    // Overwrite existing slot
    existingSlot.mesh_data = meshData
    existingSlot.date = new Date().toISOString().slice(0, 19).replace("T", " ")
  } else {
    // Add new slot
    mockCurrentProfile.saved_meshes.push({
      id: slotId,
      date: new Date().toISOString().slice(0, 19).replace("T", " "),
      mesh_data: meshData,
    })
  }
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          status: "success",
          message: `Mesh saved to slot ${slotId}.`,
        }),
      500,
    ),
  )
}

export async function updatePrinterMesh(
  profileId: number | "current",
  meshData: string,
): Promise<{ status: string; message: string }> {
  console.log(`Mock API: Updating printer mesh for profile ${profileId}`)
  mockCurrentProfile.active_mesh.mesh_data = meshData
  return new Promise((resolve) =>
    setTimeout(
      () => resolve({ status: "success", message: "Mesh content activated." }),
      500,
    ),
  )
}

export async function deleteAllMeshSlots(): Promise<{
  status: string
  message: string
}> {
  console.log(`Mock API: Deleting all mesh slots`)
  mockCurrentProfile.saved_meshes = []
  return new Promise((resolve) =>
    setTimeout(
      () => resolve({ status: "success", message: "All mesh slots deleted." }),
      500,
    ),
  )
}

export function createLevelingApiMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    // Handle new profiles API endpoints
    if (req.url?.startsWith("/api/profiles")) {
      res.setHeader("Content-Type", "application/json")

      // GET /api/profiles - List all profiles
      if (req.method === "GET" && req.url === "/api/profiles") {
        getProfiles().then((data) => {
          res.end(JSON.stringify(data))
        })
        return
      }

      // GET /api/profiles/current - Get current profile details
      if (req.method === "GET" && req.url === "/api/profiles/current") {
        getProfile("current").then((data) => {
          res.end(JSON.stringify(data))
        })
        return
      }

      // GET /api/profiles/{id} - Get specific profile details
      const getProfileMatch = req.url.match(/^\/api\/profiles\/(\d+)$/)
      if (req.method === "GET" && getProfileMatch) {
        const profileId = parseInt(getProfileMatch[1], 10)
        getProfile(profileId).then((data) => {
          res.end(JSON.stringify(data))
        })
        return
      }

      // PUT /api/profiles/current/settings
      if (
        req.method === "PUT" &&
        req.url === "/api/profiles/current/settings"
      ) {
        let body = ""
        req.on("data", (chunk) => {
          body += chunk.toString()
        })
        req.on("end", () => {
          const settings = JSON.parse(body)
          updateSettings("current", settings).then((response) => {
            res.statusCode = 200
            res.end(JSON.stringify(response))
          })
        })
        return
      }

      // PUT /api/profiles/{id}/settings
      const putSettingsMatch = req.url.match(
        /^\/api\/profiles\/(\d+|current)\/settings$/,
      )
      if (req.method === "PUT" && putSettingsMatch) {
        const profileId =
          putSettingsMatch[1] === "current"
            ? "current"
            : parseInt(putSettingsMatch[1], 10)
        let body = ""
        req.on("data", (chunk) => {
          body += chunk.toString()
        })
        req.on("end", () => {
          const settings = JSON.parse(body)
          updateSettings(profileId, settings).then((response) => {
            res.statusCode = 200
            res.end(JSON.stringify(response))
          })
        })
        return
      }

      // PUT /api/profiles/current/slots/{id}
      const putSlotMatch = req.url.match(
        /^\/api\/profiles\/(current|\d+)\/slots\/(\d+)$/,
      )
      if (req.method === "PUT" && putSlotMatch) {
        const profileId =
          putSlotMatch[1] === "current"
            ? "current"
            : parseInt(putSlotMatch[1], 10)
        const slotId = parseInt(putSlotMatch[2], 10)
        let body = ""
        req.on("data", (chunk) => {
          body += chunk.toString()
        })
        req.on("end", () => {
          const { mesh_data } = JSON.parse(body)
          saveSlot(profileId, slotId, mesh_data).then((response) => {
            res.statusCode = response.status === "success" ? 200 : 400
            res.end(JSON.stringify(response))
          })
        })
        return
      }

      // PUT /api/profiles/current/printer-mesh
      const putPrinterMeshMatch = req.url.match(
        /^\/api\/profiles\/(current|\d+)\/printer-mesh$/,
      )
      if (req.method === "PUT" && putPrinterMeshMatch) {
        const profileId =
          putPrinterMeshMatch[1] === "current"
            ? "current"
            : parseInt(putPrinterMeshMatch[1], 10)
        let body = ""
        req.on("data", (chunk) => {
          body += chunk.toString()
        })
        req.on("end", () => {
          const { mesh_data } = JSON.parse(body)
          updatePrinterMesh(profileId, mesh_data).then((response) => {
            res.statusCode = response.status === "success" ? 200 : 400
            res.end(JSON.stringify(response))
          })
        })
        return
      }

      // DELETE /api/profiles/current/slots/{id}
      const deleteSlotMatch = req.url.match(
        /^\/api\/profiles\/(current|\d+)\/slots\/(\d+)$/,
      )
      if (req.method === "DELETE" && deleteSlotMatch) {
        const profileId =
          deleteSlotMatch[1] === "current"
            ? "current"
            : parseInt(deleteSlotMatch[1], 10)
        const slotId = parseInt(deleteSlotMatch[2], 10)
        deleteSlot(profileId, slotId).then((response) => {
          res.statusCode = response.status === "success" ? 200 : 404
          res.end(JSON.stringify(response))
        })
        return
      }
    }

    // Fallback for old /api/leveling endpoints (for backward compatibility during transition)
    if (req.url?.startsWith("/api/leveling")) {
      res.setHeader("Content-Type", "application/json")

      if (req.method === "GET" && req.url === "/api/leveling") {
        getProfile("current").then((data) => {
          res.end(JSON.stringify(data))
        })
        return
      }

      // Other old endpoints can redirect to new ones if needed
    }

    next()
  }
}
