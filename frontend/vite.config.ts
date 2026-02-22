import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vitest/config"
import fs from "fs"
import path from "path"
import {
  createKobraUnleashedHttpMiddleware,
  createKobraUnleashedSocketMock,
} from "./test/mocks/kobraUnleashedMock"
import { createMockApiMiddleware } from "./test/mocks/mockApi"
import { createLevelingApiMiddleware } from "./test/mocks/levelingApi"
import { createSystemApiMiddleware } from "./test/mocks/systemApi"

export default defineConfig({
  plugins: [
    sveltekit(),
    {
      name: "mock-api-server",
      configureServer(server) {
        const host = server.config.server.host || "localhost"
        const port = server.config.server.port || 5173
        const protocol = server.config.server.https ? "https" : "http"
        const defaultMqttUrl = `${protocol}://${host}:${port}`
        const io = createKobraUnleashedSocketMock(server)
        if (io) {
          server.middlewares.use(createKobraUnleashedHttpMiddleware(io))
        }

        // System API must come before mockApi to handle /api/system endpoints
        server.middlewares.use(createSystemApiMiddleware())
        server.middlewares.use(createMockApiMiddleware(defaultMqttUrl))
        server.middlewares.use(createLevelingApiMiddleware())
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith("/webcam/cam.jpg")) {
            const imagePath = path.join(
              __dirname,
              "static",
              "webcam",
              "default.jpg",
            )
            if (fs.existsSync(imagePath)) {
              fs.readFile(imagePath, (err, data) => {
                if (err) {
                  res.writeHead(500)
                  res.end("Error reading the file")
                  return
                }
                res.writeHead(200, { "Content-Type": "image/jpeg" })
                res.end(data)
              })
            } else {
              res.writeHead(404)
              res.end("Not Found")
            }
          } else {
            next()
          }
        })
      },
    },
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "test/setup.ts",
    include: ["test/components/**/*.test.ts"],
  },
  resolve: process.env.VITEST
    ? {
        conditions: ["browser"],
      }
    : undefined,
  ssr: {
    noExternal: ["echarts", "echarts-gl", "claygl"],
  },
})
