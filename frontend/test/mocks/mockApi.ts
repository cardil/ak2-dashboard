import fs from "fs"
import path from "path"
import type { Connect } from "vite"

// Path to the source of truth JSON files
const API_SOURCE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "webserver",
  "opt",
  "webfs",
  "api",
)

function getApiFilePath(url: string): string | null {
  const requestUrl = new URL(url, "http://localhost")
  const apiEndpoint = requestUrl.pathname.substring("/api/".length)
  // Only handle webserver.json - other endpoints handled by systemApi
  if (!apiEndpoint || !["webserver.json"].includes(apiEndpoint)) {
    return null
  }
  return path.join(API_SOURCE_PATH, apiEndpoint)
}

export function createMockApiMiddleware(
  defaultMqttUrl: string,
): Connect.NextHandleFunction {
  return (
    req: Connect.IncomingMessage,
    res: any,
    next: Connect.NextFunction,
  ) => {
    if (!req.url?.startsWith("/api/")) {
      return next()
    }

    const filePath = getApiFilePath(req.url)

    if (!filePath || !fs.existsSync(filePath)) {
      return next()
    }

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8")

      if (req.url.startsWith("/api/webserver.json")) {
        const data = JSON.parse(fileContent)
        const requestUrl = new URL(req.url, `http://${req.headers.host}`)
        const apiUrlOverride = requestUrl.searchParams.get("api_url")

        if (apiUrlOverride) {
          data.mqtt_webui_url =
            apiUrlOverride === "unavailable" ? "" : apiUrlOverride
        } else {
          data.mqtt_webui_url = process.env.VITE_MOCK_MQTT_URL || defaultMqttUrl
        }

        const modifiedContent = JSON.stringify(data)
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(modifiedContent)
      } else {
        // For other files, serve them as is
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(fileContent)
      }
    } catch (error) {
      res.writeHead(500)
      res.end("Error processing the request")
      console.error(error)
    }
  }
}
