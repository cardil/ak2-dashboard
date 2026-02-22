import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/smoke/**/*.test.ts"],
    setupFiles: ["test/smoke/setup.ts"],
    testTimeout: 30000,
  },
})
