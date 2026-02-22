import { writable, get } from "svelte/store"
import { browser } from "$app/environment"

export interface FileEntry {
  name: string
  isDirectory: boolean
  size?: number
  mtime?: number
}

function createFileBrowserStore() {
  const { subscribe, set } = writable<FileEntry[]>([])
  const currentPathStore = writable<string>("/files/")

  function sortFiles(files: FileEntry[]): FileEntry[] {
    return files.sort((a, b) => {
      // Directories come first
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      // Within same type, sort alphabetically by name (case-insensitive)
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    })
  }

  async function fetchFiles() {
    if (!browser) return
    const currentPath = get(currentPathStore)

    try {
      // Ensure path starts with /files/ and ends with / for directories
      const fetchPath =
        currentPath === "/files/"
          ? "/files/"
          : currentPath.endsWith("/")
            ? currentPath
            : `${currentPath}/`
      const response = await fetch(fetchPath, {
        headers: { Accept: "application/json" },
      })
      if (response.ok) {
        const contentType = response.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
          // JSON API response
          const files: FileEntry[] = await response.json()
          // Filter out parent directory markers
          const filteredFiles = files.filter(
            (file) =>
              file.name !== ".." &&
              file.name !== "." &&
              file.name.trim() !== "",
          )
          set(sortFiles(filteredFiles))
        } else {
          // HTML directory listing (real backend)
          const html = await response.text()
          const parser = new DOMParser()
          const doc = parser.parseFromString(html, "text/html")
          const links = Array.from(doc.querySelectorAll("a"))
          const files: FileEntry[] = links
            .map((link) => {
              const name = (link.textContent || "").trim()
              const href = link.getAttribute("href") || ""
              // Check if it's a directory by trailing slash in name or href
              const isDirectory = name.endsWith("/") || href.endsWith("/")
              const cleanName = isDirectory ? name.replace(/\/$/, "") : name
              return {
                name: cleanName,
                isDirectory,
              }
            })
            .filter(
              (file) =>
                file.name !== ".." &&
                file.name !== "." &&
                file.name !== "" &&
                !file.name.startsWith(".."), // Also filter names starting with ..
            )
          set(sortFiles(files))
        }
      } else {
        set([])
      }
    } catch (error) {
      console.error("Error fetching files:", error)
      set([])
    }
  }

  function navigate(path: string) {
    const currentPath = get(currentPathStore)

    let newPath: string
    if (path.startsWith("/files/")) {
      newPath = path.endsWith("/") ? path : `${path}/`
    } else if (path.startsWith("/")) {
      const fullPath = `/files${path}`
      newPath = fullPath.endsWith("/") ? fullPath : `${fullPath}/`
    } else {
      const fullPath = `${currentPath}${path}`
      newPath = fullPath.endsWith("/") ? fullPath : `${fullPath}/`
    }

    currentPathStore.set(newPath)
    fetchFiles()
  }

  function goUp() {
    const currentPath = get(currentPathStore)
    const segments = currentPath
      .replace("/files/", "")
      .split("/")
      .filter((s) => s)
    segments.pop()
    const newPath =
      segments.length === 0 ? "/files/" : `/files/${segments.join("/")}/`
    currentPathStore.set(newPath)
    fetchFiles()
  }

  function navigateToPath(index: number) {
    if (index === -1) {
      // Navigate to root
      currentPathStore.set("/files/")
      fetchFiles()
      return
    }
    const currentPath = get(currentPathStore)
    const segments = currentPath
      .replace("/files/", "")
      .split("/")
      .filter((s) => s)
    const newPath = `/files/${segments.slice(0, index + 1).join("/")}/`
    currentPathStore.set(newPath)
    fetchFiles()
  }

  function canGoUp(): boolean {
    const currentPath = get(currentPathStore)
    const pathWithoutPrefix = currentPath
      .replace("/files/", "")
      .replace(/^\/+|\/+$/g, "")
    return pathWithoutPrefix.length > 0
  }

  function getCurrentPath(): string {
    const currentPath = get(currentPathStore)
    return currentPath.replace("/files", "") || "/"
  }

  return {
    subscribe,
    fetchFiles,
    navigate,
    goUp,
    navigateToPath,
    getCurrentPath,
    canGoUp,
    currentPath: currentPathStore,
  }
}

export const fileBrowserStore = createFileBrowserStore()
