import { createServer } from "vite"
import fetch from "node-fetch"
import { describe, it, expect, beforeAll, afterAll } from "vitest"

describe("Vite Dev Server Smoke Test", () => {
  let server
  let baseUrl

  beforeAll(async () => {
    server = await createServer({
      root: process.cwd(),
      configFile: "vite.config.ts",
      server: {
        port: 0,
      },
    })
    await server.listen()
    const address = server.httpServer.address()
    const port = typeof address === "object" ? address.port : 0
    baseUrl = `http://localhost:${port}`
  })

  afterAll(async () => {
    await server.close()
  })

  describe("should start and respond to requests without errors", () => {
    const pathsToTest = ["/", "/leveling", "/system-tools", "/docs"]

    for (const path of pathsToTest) {
      it(`should fetch ${path} successfully`, async () => {
        const response = await fetch(`${baseUrl}${path}`)
        expect(response.ok).toBe(true)
      })
    }
  })
})
