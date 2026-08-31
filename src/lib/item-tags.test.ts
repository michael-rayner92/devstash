import { describe, expect, it } from "vitest"
import { appendTag, parseTagList } from "./item-tags"

describe("parseTagList", () => {
  it("splits on commas and trims each tag", () => {
    expect(parseTagList("react, hooks ,  typescript")).toEqual([
      "react",
      "hooks",
      "typescript",
    ])
  })

  it("drops empty entries from stray commas and whitespace", () => {
    expect(parseTagList("react, , ,hooks,")).toEqual(["react", "hooks"])
  })

  it("returns an empty array for a blank input", () => {
    expect(parseTagList("")).toEqual([])
    expect(parseTagList("   ")).toEqual([])
    expect(parseTagList(", ,")).toEqual([])
  })

  it("keeps duplicates — the Zod layer dedupes, so typing isn't disturbed", () => {
    expect(parseTagList("react, react")).toEqual(["react", "react"])
  })
})

describe("appendTag", () => {
  it("returns the tag alone when the input is empty", () => {
    expect(appendTag("", "react")).toBe("react")
    expect(appendTag("   ", "react")).toBe("react")
  })

  it("appends with a comma and space", () => {
    expect(appendTag("react", "hooks")).toBe("react, hooks")
  })

  it("does not double up a trailing comma or whitespace", () => {
    expect(appendTag("react, ", "hooks")).toBe("react, hooks")
    expect(appendTag("react,", "hooks")).toBe("react, hooks")
    expect(appendTag("react ,  ", "hooks")).toBe("react, hooks")
  })

  it("leaves interior spacing as the user typed it", () => {
    expect(appendTag("react,hooks", "typescript")).toBe("react,hooks, typescript")
  })
})
