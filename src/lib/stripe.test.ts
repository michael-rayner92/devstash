import { afterEach, describe, expect, it, vi } from "vitest"
import { baseUrl, getStripe, isProStatus } from "@/lib/stripe"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("isProStatus", () => {
  it("grants Pro for active and trialing subscriptions", () => {
    expect(isProStatus("active")).toBe(true)
    expect(isProStatus("trialing")).toBe(true)
  })

  it("revokes Pro for past_due — a failed payment drops access immediately", () => {
    expect(isProStatus("past_due")).toBe(false)
  })

  it("revokes Pro for every other Stripe status", () => {
    for (const status of [
      "canceled",
      "unpaid",
      "incomplete",
      "incomplete_expired",
      "paused",
    ]) {
      expect(isProStatus(status)).toBe(false)
    }
  })

  it("treats a missing status as not Pro", () => {
    expect(isProStatus(null)).toBe(false)
    expect(isProStatus(undefined)).toBe(false)
    expect(isProStatus("")).toBe(false)
  })
})

describe("baseUrl", () => {
  it("uses NEXTAUTH_URL when set", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://devstash.io")
    expect(baseUrl()).toBe("https://devstash.io")
  })

  it("falls back to localhost when unset", () => {
    vi.stubEnv("NEXTAUTH_URL", undefined)
    expect(baseUrl()).toBe("http://localhost:3000")
  })
})

describe("getStripe", () => {
  it("throws a configuration error rather than constructing a client without a key", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", undefined)
    expect(() => getStripe()).toThrow(/STRIPE_SECRET_KEY/)
  })
})
