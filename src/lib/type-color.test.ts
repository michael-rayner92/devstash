import { describe, it, expect } from "vitest"
import { typeTextColor } from "./type-color"

describe("typeTextColor", () => {
  it("mixes the given color toward white in oklab", () => {
    expect(typeTextColor("#3b82f6")).toBe(
      "color-mix(in oklab, #3b82f6 72%, white)"
    )
  })

  it("preserves the caller's color notation verbatim", () => {
    // Callers pass either a stored hex or a CSS var reference.
    expect(typeTextColor("var(--type-color)")).toBe(
      "color-mix(in oklab, var(--type-color) 72%, white)"
    )
  })

  it("mixes toward white, never away from it", () => {
    // Guards the direction of the mix — swapping the operands would darken the
    // text and make the contrast problem worse rather than better.
    const result = typeTextColor("#000000")
    expect(result).toMatch(/white\)$/)
    expect(result).not.toMatch(/black/)
  })
})
