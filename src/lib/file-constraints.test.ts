import { describe, expect, it } from "vitest"
import {
  contentTypeForFile,
  extensionOf,
  FILE_CONSTRAINT,
  IMAGE_CONSTRAINT,
  validateUpload,
} from "@/lib/file-constraints"

describe("extensionOf", () => {
  it("lowercases the extension including the dot", () => {
    expect(extensionOf("Photo.PNG")).toBe(".png")
    expect(extensionOf("archive.TAR.GZ")).toBe(".gz")
  })

  it("returns empty string for no/edge-case extensions", () => {
    expect(extensionOf("README")).toBe("")
    expect(extensionOf(".gitignore")).toBe("") // dotfile: dot at index 0
    expect(extensionOf("trailing.")).toBe("")
  })
})

describe("contentTypeForFile", () => {
  it("maps known extensions to their MIME type", () => {
    expect(contentTypeForFile("a.svg")).toBe("image/svg+xml")
    expect(contentTypeForFile("notes.md")).toBe("text/markdown")
    expect(contentTypeForFile("config.yml")).toBe("application/x-yaml")
  })

  it("falls back to octet-stream for unknown extensions", () => {
    expect(contentTypeForFile("mystery.bin")).toBe("application/octet-stream")
  })
})

describe("validateUpload", () => {
  it("accepts an allowed image within the size limit", () => {
    expect(validateUpload("image", "logo.png", 1024)).toEqual({ ok: true })
  })

  it("accepts an allowed file within the size limit", () => {
    expect(validateUpload("file", "data.json", 1024)).toEqual({ ok: true })
  })

  it("rejects an extension that isn't allowed for the kind", () => {
    // .png is an image extension, not a file extension
    const result = validateUpload("file", "logo.png", 1024)
    expect(result.ok).toBe(false)
  })

  it("rejects a file over the size limit", () => {
    const result = validateUpload("image", "big.png", IMAGE_CONSTRAINT.maxSize + 1)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/too large/i)
  })

  it("rejects a file with no extension", () => {
    expect(validateUpload("file", "Makefile", 10).ok).toBe(false)
  })

  it("enforces distinct size limits per kind", () => {
    // 6 MB: over the 5 MB image limit but under the 10 MB file limit
    const sixMb = 6 * 1024 * 1024
    expect(validateUpload("image", "big.png", sixMb).ok).toBe(false)
    expect(validateUpload("file", "big.pdf", sixMb).ok).toBe(true)
    expect(FILE_CONSTRAINT.maxSize).toBeGreaterThan(IMAGE_CONSTRAINT.maxSize)
  })
})
