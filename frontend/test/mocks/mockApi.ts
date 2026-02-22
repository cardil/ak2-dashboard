import fs from "fs"
import path from "path"
import type { Connect } from "vite"

// Sample webserver.json for local dev - mirrors /etc/webfs/webserver.json on the printer
const WEBSERVER_JSON_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "e2e",
  "config",
  "webfs",
  "webserver.json",
)

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

    // Only handle GET /api/webserver (exact match)
    const requestUrl = new URL(req.url, "http://localhost")
    if (requestUrl.pathname !== "/api/webserver") {
      return next()
    }

    if (!fs.existsSync(WEBSERVER_JSON_PATH)) {
      res.writeHead(404, { "Content-Type": "application/json" })
      res.end(
        JSON.stringify({
          status: "error",
          message: "webserver.json not found",
        }),
      )
      return
    }

    try {
      const fileContent = fs.readFileSync(WEBSERVER_JSON_PATH, "utf-8")
      const data = JSON.parse(fileContent)

      const apiUrlOverride = requestUrl.searchParams.get("api_url")
      // Use !== null (not truthy) to distinguish "param present with empty
      // value" (?api_url= → unconfigured Kobra) from "param absent" (→ use
      // default mock URL). Empty string is a valid override meaning "no Kobra".
      if (apiUrlOverride !== null) {
        data.mqtt_webui_url = apiUrlOverride
      } else {
        data.mqtt_webui_url = process.env.VITE_MOCK_MQTT_URL || defaultMqttUrl
      }

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(data))
    } catch (error) {
      res.writeHead(500)
      res.end("Error processing the request")
      console.error(error)
    }
  }
}
