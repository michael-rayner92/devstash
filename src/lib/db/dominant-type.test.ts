import { describe, expect, it } from "vitest"
import { computeDominantType } from "./dominant-type"
import type { ItemType } from "@/generated/prisma/client"

function makeType(id: string, name: string): ItemType {
  return { id, name, icon: name, color: `#${id}`, isSystem: true, userId: null }
}

const snippet = makeType("t1", "snippet")
const note = makeType("t2", "note")
const link = makeType("t3", "link")

describe("computeDominantType", () => {
  it("returns null and no types for an empty list", () => {
    expect(computeDominantType([])).toEqual({ dominantType: null, allTypes: [] })
  })

  it("picks the most frequent type", () => {
    const result = computeDominantType([snippet, snippet, note])
    expect(result.dominantType).toBe(snippet)
  })

  it("resolves ties to the first-seen type", () => {
    // note and link each appear once; note is seen first.
    const result = computeDominantType([note, link])
    expect(result.dominantType).toBe(note)
  })

  it("lists distinct types in first-seen order", () => {
    const result = computeDominantType([note, snippet, note, link])
    expect(result.allTypes).toEqual([note, snippet, link])
  })
})
