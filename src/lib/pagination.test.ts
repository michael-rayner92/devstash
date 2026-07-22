import { describe, expect, it } from "vitest"
import { getPageMeta, getPageNumbers, parsePageParam } from "@/lib/pagination"

describe("parsePageParam", () => {
  it("returns 1 for missing, empty, or non-numeric input", () => {
    expect(parsePageParam(undefined)).toBe(1)
    expect(parsePageParam("")).toBe(1)
    expect(parsePageParam("abc")).toBe(1)
  })

  it("returns 1 for zero, negative, or non-integer values", () => {
    expect(parsePageParam("0")).toBe(1)
    expect(parsePageParam("-3")).toBe(1)
    expect(parsePageParam("2.5")).toBe(1)
  })

  it("parses a valid positive integer", () => {
    expect(parsePageParam("4")).toBe(4)
  })

  it("uses the first entry when given an array", () => {
    expect(parsePageParam(["3", "9"])).toBe(3)
  })
})

describe("getPageMeta", () => {
  it("computes skip/take for the requested page", () => {
    expect(getPageMeta(50, 21, 2)).toEqual({ page: 2, totalPages: 3, skip: 21, take: 21 })
  })

  it("always yields at least one page for an empty set", () => {
    expect(getPageMeta(0, 21, 1)).toEqual({ page: 1, totalPages: 1, skip: 0, take: 21 })
  })

  it("clamps a page above the last page down to the last page", () => {
    expect(getPageMeta(25, 21, 99)).toEqual({ page: 2, totalPages: 2, skip: 21, take: 21 })
  })

  it("clamps a page below 1 up to page 1", () => {
    expect(getPageMeta(25, 21, 0)).toMatchObject({ page: 1, skip: 0 })
  })
})

describe("getPageNumbers", () => {
  it("returns an empty list for zero pages", () => {
    expect(getPageNumbers(1, 0)).toEqual([])
  })

  it("returns a single page without controls", () => {
    expect(getPageNumbers(1, 1)).toEqual([1])
  })

  it("lists every page contiguously when they all fit around the window", () => {
    expect(getPageNumbers(2, 3)).toEqual([1, 2, 3])
  })

  it("collapses gaps to ellipsis around the current page", () => {
    expect(getPageNumbers(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10])
  })

  it("does not insert a leading ellipsis when the window touches page 1", () => {
    expect(getPageNumbers(2, 10)).toEqual([1, 2, 3, "ellipsis", 10])
  })

  it("does not insert a trailing ellipsis when the window touches the last page", () => {
    expect(getPageNumbers(9, 10)).toEqual([1, "ellipsis", 8, 9, 10])
  })
})
