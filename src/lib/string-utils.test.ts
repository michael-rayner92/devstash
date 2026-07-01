import { describe, expect, it } from "vitest"
import { getInitials } from "@/lib/string-utils"

describe("getInitials", () => {
  it("returns the first letter of each of the first two words, uppercased", () => {
    expect(getInitials("John Doe")).toBe("JD")
    expect(getInitials("john doe")).toBe("JD")
  })

  it("returns a single letter for a single-word name", () => {
    expect(getInitials("Madonna")).toBe("M")
  })

  it("ignores extra whitespace between words", () => {
    expect(getInitials("  John   Doe  ")).toBe("JD")
  })

  it("only uses the first two words", () => {
    expect(getInitials("John Middle Doe")).toBe("JM")
  })

  it("falls back to '?' for an empty or whitespace-only name", () => {
    expect(getInitials("")).toBe("?")
    expect(getInitials("   ")).toBe("?")
  })
})
