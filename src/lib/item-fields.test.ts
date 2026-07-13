import { describe, expect, it } from "vitest"
import {
  CONTENT_TYPES,
  FILE_TYPES,
  LANGUAGE_TYPES,
  MARKDOWN_TYPES,
  isCodeType,
  isFileType,
  isMarkdownType,
} from "./item-fields"

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

  it("treats only note and prompt as markdown types", () => {
    expect([...MARKDOWN_TYPES].sort()).toEqual(["note", "prompt"])
  })

  it("isMarkdownType is true only for note and prompt", () => {
    expect(isMarkdownType("note")).toBe(true)
    expect(isMarkdownType("prompt")).toBe(true)
    expect(isMarkdownType("snippet")).toBe(false)
    expect(isMarkdownType("command")).toBe(false)
    expect(isMarkdownType("link")).toBe(false)
    expect(isMarkdownType("unknown")).toBe(false)
  })

  it("code and markdown types are disjoint and cover all content types", () => {
    for (const type of CONTENT_TYPES) {
      // Every content-bearing type routes to exactly one editor.
      expect(isCodeType(type) !== isMarkdownType(type)).toBe(true)
    }
  })

  it("treats only file and image as file types", () => {
    expect([...FILE_TYPES].sort()).toEqual(["file", "image"])
  })

  it("isFileType is true only for file and image", () => {
    expect(isFileType("file")).toBe(true)
    expect(isFileType("image")).toBe(true)
    expect(isFileType("snippet")).toBe(false)
    expect(isFileType("link")).toBe(false)
    expect(isFileType("unknown")).toBe(false)
  })

  it("file types never carry a text body", () => {
    for (const type of FILE_TYPES) {
      expect(CONTENT_TYPES.has(type)).toBe(false)
      expect(isCodeType(type)).toBe(false)
      expect(isMarkdownType(type)).toBe(false)
    }
  })
})
