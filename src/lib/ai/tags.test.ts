import { describe, expect, it } from "vitest"
import { MAX_AI_CONTENT_CHARS, MAX_AI_TITLE_CHARS } from "@/lib/ai/limits"
import { MAX_SUGGESTED_TAGS, buildTagInput, parseSuggestedTags } from "@/lib/ai/tags"

describe("buildTagInput", () => {
  it("includes both title and content in labelled sections", () => {
    const input = buildTagInput({ title: "Debounce hook", content: "const x = 1" })
    expect(input).toContain("Title: Debounce hook")
    expect(input).toContain("const x = 1")
  })

  it("truncates content to the documented cap", () => {
    const content = "a".repeat(MAX_AI_CONTENT_CHARS + 500)
    const input = buildTagInput({ title: "Big", content })
    expect(input).toContain("a".repeat(MAX_AI_CONTENT_CHARS))
    expect(input).not.toContain("a".repeat(MAX_AI_CONTENT_CHARS + 1))
  })

  /**
   * Capping only the content would leave per-call cost unbounded through the
   * title, which is the other half of what gets sent.
   */
  it("truncates an oversized title", () => {
    const title = "t".repeat(MAX_AI_TITLE_CHARS + 5000)
    const input = buildTagInput({ title, content: null })
    expect(input).toContain("t".repeat(MAX_AI_TITLE_CHARS))
    expect(input).not.toContain("t".repeat(MAX_AI_TITLE_CHARS + 1))
  })

  it("omits the content section entirely when there is none", () => {
    for (const content of [null, "   "]) {
      const input = buildTagInput({ title: "Just a title", content })
      expect(input).toContain("Title: Just a title")
      expect(input).not.toContain("Content:")
    }
  })

  /**
   * Regression guard: with `text.format` of type `json_object` the API rejects
   * the request unless "json" appears in `input` — having it in `instructions`
   * alone returns a 400, which is how this was originally found.
   */
  it("always mentions json, which json_object format requires of the input", () => {
    expect(buildTagInput({ title: "T", content: "c" }).toLowerCase()).toContain("json")
    expect(buildTagInput({ title: "T", content: null }).toLowerCase()).toContain("json")
  })

  it("marks the title as absent rather than sending an empty label", () => {
    expect(buildTagInput({ title: "  ", content: "docker compose up" })).toContain(
      "Title: (none)"
    )
  })
})

describe("parseSuggestedTags", () => {
  it("reads the documented { tags: [...] } shape", () => {
    expect(parseSuggestedTags('{"tags":["react","hooks"]}')).toEqual(["react", "hooks"])
  })

  it("also reads a bare array, which the model sometimes returns instead", () => {
    expect(parseSuggestedTags('["react","hooks"]')).toEqual(["react", "hooks"])
  })

  it("lowercases and trims", () => {
    expect(parseSuggestedTags('{"tags":["  React ","TypeScript"]}')).toEqual([
      "react",
      "typescript",
    ])
  })

  it("strips a leading hash", () => {
    expect(parseSuggestedTags('{"tags":["#react","##docker"]}')).toEqual([
      "react",
      "docker",
    ])
  })

  it("dedupes case-insensitively", () => {
    expect(parseSuggestedTags('{"tags":["react","React","REACT"]}')).toEqual(["react"])
  })

  it(`caps at ${MAX_SUGGESTED_TAGS} tags`, () => {
    const many = Array.from({ length: 12 }, (_, i) => `tag${i}`)
    expect(parseSuggestedTags(JSON.stringify({ tags: many }))).toHaveLength(
      MAX_SUGGESTED_TAGS
    )
  })

  it("drops non-strings, empties, and sentence-length entries", () => {
    const raw = JSON.stringify({
      tags: ["react", 42, null, "  ", "a".repeat(64), "docker"],
    })
    expect(parseSuggestedTags(raw)).toEqual(["react", "docker"])
  })

  it("returns an empty array for unusable output rather than throwing", () => {
    expect(parseSuggestedTags("not json at all")).toEqual([])
    expect(parseSuggestedTags("")).toEqual([])
    expect(parseSuggestedTags('{"tags":"react"}')).toEqual([])
    expect(parseSuggestedTags('{"suggestions":["react"]}')).toEqual([])
    expect(parseSuggestedTags("null")).toEqual([])
  })
})
