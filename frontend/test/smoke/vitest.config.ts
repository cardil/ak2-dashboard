// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2024-2026 Chris Suszynski (@cardil)
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/smoke/**/*.test.ts"],
    setupFiles: ["test/smoke/setup.ts"],
    testTimeout: 30000,
  },
})
