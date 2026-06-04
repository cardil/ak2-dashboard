// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2024-2026 Chris Suszynski (@cardil)
import { render, screen } from "@testing-library/svelte"
import { describe, it, expect } from "vitest"
import TestCard from "./TestCard.svelte"

describe("Card", () => {
  it("renders the component with the correct title", () => {
    const title = "Test Card"
    render(TestCard, { title })

    expect(screen.getByText(title)).toBeInTheDocument()
  })
})
