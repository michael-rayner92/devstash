import { describe, expect, it } from "vitest"
import { AI_BUSY_MESSAGE, AI_QUOTA_MESSAGE, aiErrorMessage } from "@/lib/ai/errors"

const FALLBACK = "generic fallback"

/**
 * Shaped after a real `insufficient_quota` throw captured from the dev server:
 * the SDK sets `code`/`type` on the error itself AND nests the response body.
 */
const QUOTA_ERROR = Object.assign(new Error("429 You exceeded your current quota"), {
  status: 429,
  code: "insufficient_quota",
  type: "insufficient_quota",
  error: {
    message: "You exceeded your current quota, please check your plan and billing details.",
    type: "insufficient_quota",
    code: "insufficient_quota",
    param: null,
  },
})

describe("aiErrorMessage", () => {
  it("names a quota failure, which no amount of retrying fixes", () => {
    expect(aiErrorMessage(QUOTA_ERROR, FALLBACK)).toBe(AI_QUOTA_MESSAGE)
  })

  it("reads quota from the nested body alone", () => {
    const err = { status: 429, error: { code: "insufficient_quota" } }
    expect(aiErrorMessage(err, FALLBACK)).toBe(AI_QUOTA_MESSAGE)
  })

  /**
   * The reason quota is checked first: both are HTTP 429, so a status-only
   * branch would report a permanent billing problem as "try again shortly".
   */
  it("does not mistake a quota failure for throttling despite both being 429", () => {
    expect(aiErrorMessage(QUOTA_ERROR, FALLBACK)).not.toBe(AI_BUSY_MESSAGE)
  })

  it("treats an explicit rate limit as transient", () => {
    const err = { status: 429, code: "rate_limit_exceeded", type: "rate_limit_exceeded" }
    expect(aiErrorMessage(err, FALLBACK)).toBe(AI_BUSY_MESSAGE)
  })

  it("treats a bare 429 as throttling", () => {
    expect(aiErrorMessage({ status: 429 }, FALLBACK)).toBe(AI_BUSY_MESSAGE)
  })

  it("falls back for everything else", () => {
    expect(aiErrorMessage({ status: 500, code: "server_error" }, FALLBACK)).toBe(FALLBACK)
    expect(aiErrorMessage({ status: 401, code: "invalid_api_key" }, FALLBACK)).toBe(FALLBACK)
    expect(aiErrorMessage(new Error("socket hang up"), FALLBACK)).toBe(FALLBACK)
  })

  it("survives throws that aren't objects at all", () => {
    expect(aiErrorMessage(null, FALLBACK)).toBe(FALLBACK)
    expect(aiErrorMessage(undefined, FALLBACK)).toBe(FALLBACK)
    expect(aiErrorMessage("a string", FALLBACK)).toBe(FALLBACK)
    expect(aiErrorMessage({ error: null }, FALLBACK)).toBe(FALLBACK)
  })
})
