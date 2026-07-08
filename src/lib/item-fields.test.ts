import { describe, expect, it } from "vitest"
import { CONTENT_TYPES, LANGUAGE_TYPES, isCodeType } from "./item-fields"

describe("item-fields", () => {
  it("marks text-bearing types as content types", () => {
    for (const type of ["snippet", "prompt", "command", "note"]) {
      expect(CONTENT_TYPES.has(type)).toBe(true)
    }
  })

  it("does not treat link/file/image as content types", () => {
    for (const type of ["link", "file", "image"]) {
      expect(CONTENT_TYPES.has(type)).toBe(false)
    }
  })

  it("treats only snippet and command as language/code types", () => {
    expect([...LANGUAGE_TYPES].sort()).toEqual(["command", "snippet"])
  })

  it("isCodeType is true only for snippet and command", () => {
    expect(isCodeType("snippet")).toBe(true)
    expect(isCodeType("command")).toBe(true)
    expect(isCodeType("prompt")).toBe(false)
    expect(isCodeType("note")).toBe(false)
    expect(isCodeType("link")).toBe(false)
    expect(isCodeType("unknown")).toBe(false)
  })
})
