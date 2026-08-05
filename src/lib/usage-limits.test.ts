import { afterEach, describe, expect, it, vi } from "vitest"
import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
  billingEnforced,
  collectionLimitError,
  getPlanLimits,
  itemLimitError,
  uploadNotAllowedError,
} from "@/lib/usage-limits"

/**
 * `billingEnforced()` reads process.env on every call (rather than at module
 * load), which is exactly what lets these tests use vi.stubEnv without
 * resetModules + a dynamic import.
 */
function enforce(on: boolean) {
  vi.stubEnv("BILLING_ENFORCED", on ? "true" : "false")
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("billingEnforced", () => {
  it("is off by default (env unset) — everything unlocked during development", () => {
    vi.stubEnv("BILLING_ENFORCED", undefined)
    expect(billingEnforced()).toBe(false)
  })

  it('is on only for the exact string "true"', () => {
    enforce(true)
    expect(billingEnforced()).toBe(true)

    for (const value of ["false", "1", "TRUE", "yes", ""]) {
      vi.stubEnv("BILLING_ENFORCED", value)
      expect(billingEnforced()).toBe(false)
    }
  })
})

describe("getPlanLimits", () => {
  it("returns unlimited for a Pro user under enforcement", () => {
    enforce(true)
    expect(getPlanLimits(true)).toEqual({
      items: null,
      collections: null,
      uploads: true,
    })
  })

  it("returns the Free limits for a Free user under enforcement", () => {
    enforce(true)
    expect(getPlanLimits(false)).toEqual({
      items: FREE_ITEM_LIMIT,
      collections: FREE_COLLECTION_LIMIT,
      uploads: false,
    })
  })

  it("returns unlimited for a Free user when enforcement is off", () => {
    enforce(false)
    expect(getPlanLimits(false)).toEqual({
      items: null,
      collections: null,
      uploads: true,
    })
  })

  it("uses the documented Free limits", () => {
    expect(FREE_ITEM_LIMIT).toBe(50)
    expect(FREE_COLLECTION_LIMIT).toBe(3)
  })
})

describe("itemLimitError", () => {
  it("allows a Free user below the limit and blocks at and above it", () => {
    enforce(true)
    expect(itemLimitError(false, 0)).toBeNull()
    expect(itemLimitError(false, 49)).toBeNull()
    expect(itemLimitError(false, 50)).toBeTypeOf("string")
    expect(itemLimitError(false, 51)).toBeTypeOf("string")
  })

  it("never blocks a Pro user, even past the Free limit", () => {
    enforce(true)
    expect(itemLimitError(true, 50)).toBeNull()
    expect(itemLimitError(true, 5000)).toBeNull()
  })

  it("never blocks when enforcement is off", () => {
    enforce(false)
    expect(itemLimitError(false, 50)).toBeNull()
    expect(itemLimitError(false, 5000)).toBeNull()
  })

  it("names the limit and Pro in the message (it renders as a toast)", () => {
    enforce(true)
    const message = itemLimitError(false, 50)
    expect(message).toContain("50")
    expect(message).toContain("Pro")
  })
})

describe("collectionLimitError", () => {
  it("allows a Free user below the limit and blocks at and above it", () => {
    enforce(true)
    expect(collectionLimitError(false, 0)).toBeNull()
    expect(collectionLimitError(false, 2)).toBeNull()
    expect(collectionLimitError(false, 3)).toBeTypeOf("string")
    expect(collectionLimitError(false, 4)).toBeTypeOf("string")
  })

  it("never blocks a Pro user, even past the Free limit", () => {
    enforce(true)
    expect(collectionLimitError(true, 3)).toBeNull()
  })

  it("never blocks when enforcement is off", () => {
    enforce(false)
    expect(collectionLimitError(false, 3)).toBeNull()
  })

  it("names the limit and Pro in the message (it renders as a toast)", () => {
    enforce(true)
    const message = collectionLimitError(false, 3)
    expect(message).toContain("3")
    expect(message).toContain("Pro")
  })
})

describe("uploadNotAllowedError", () => {
  it("blocks a Free user under enforcement", () => {
    enforce(true)
    expect(uploadNotAllowedError(false)).toBeTypeOf("string")
  })

  it("allows a Pro user", () => {
    enforce(true)
    expect(uploadNotAllowedError(true)).toBeNull()
  })

  it("allows a Free user when enforcement is off", () => {
    enforce(false)
    expect(uploadNotAllowedError(false)).toBeNull()
  })

  it("names Pro in the message (it renders as a toast)", () => {
    enforce(true)
    expect(uploadNotAllowedError(false)).toContain("Pro")
  })
})
