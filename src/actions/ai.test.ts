import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import { generateAutoTags } from "@/actions/ai"
import { auth } from "@/auth"
import { AI_QUOTA_MESSAGE } from "@/lib/ai/errors"
import { getIsPro } from "@/lib/db/billing"
import { checkRateLimit } from "@/lib/rate-limit"

/**
 * OpenAI is mocked at the module boundary — these tests never make a real API
 * call. `vi.hoisted` gives a stable mock the assertions can inspect (a factory
 * returning a fresh `vi.fn()` each call would not be assertable).
 */
const mocks = vi.hoisted(() => ({
  responses: { create: vi.fn() },
}))

vi.mock("@/lib/ai/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/client")>()
  return {
    ...actual,
    getOpenAI: () => ({ responses: mocks.responses }),
    aiConfigured: vi.fn(() => true),
  }
})

vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db/billing", () => ({ getIsPro: vi.fn() }))
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  retryAfterMinutes: vi.fn(() => 17),
}))

const SESSION: Session = {
  user: { id: "user-1", email: "demo@devstash.io", isPro: true },
  expires: "2099-01-01T00:00:00.000Z",
}

const INPUT = { title: "Debounce hook", content: "export function useDebounce() {}" }

function respondWith(outputText: string) {
  mocks.responses.create.mockResolvedValue({ output_text: outputText })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BILLING_ENFORCED", "true")
  vi.mocked(auth).mockResolvedValue(SESSION)
  vi.mocked(getIsPro).mockResolvedValue(true)
  vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 19, reset: 0 })
  respondWith('{"tags":["react","hooks","debounce"]}')
})

describe("generateAutoTags", () => {
  it("requires a session", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    expect(await generateAutoTags(INPUT)).toEqual({
      success: false,
      error: "Not authenticated",
    })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("rejects input with neither a title nor content", async () => {
    const result = await generateAutoTags({ title: "   ", content: "  " })

    expect(result).toEqual({ success: false, error: "Add a title or some content first" })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("accepts a title with no content", async () => {
    respondWith('{"tags":["docker"]}')

    expect(await generateAutoTags({ title: "Docker cheatsheet", content: null })).toEqual({
      success: true,
      data: { tags: ["docker"] },
    })
  })

  it("blocks free users under enforcement before spending a call", async () => {
    vi.mocked(getIsPro).mockResolvedValue(false)

    const result = await generateAutoTags(INPUT)

    expect(result.success).toBe(false)
    expect(result).toMatchObject({ error: expect.stringContaining("Pro") })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("allows free users when billing enforcement is off", async () => {
    vi.stubEnv("BILLING_ENFORCED", "false")
    vi.mocked(getIsPro).mockResolvedValue(false)

    expect(await generateAutoTags(INPUT)).toEqual({
      success: true,
      data: { tags: ["react", "hooks", "debounce"] },
    })
  })

  it("reports a missing account rather than calling OpenAI", async () => {
    vi.mocked(getIsPro).mockResolvedValue(null)

    expect(await generateAutoTags(INPUT)).toEqual({
      success: false,
      error: "Account not found",
    })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("rate limits per user and names the wait", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 17 * 60_000,
    })

    const result = await generateAutoTags(INPUT)

    expect(checkRateLimit).toHaveBeenCalledWith("ai", "ai:user-1")
    expect(result).toEqual({
      success: false,
      error: "You've used all your AI requests for now. Try again in 17 minutes.",
    })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("calls the Responses API with json_object and opts out of retention", async () => {
    await generateAutoTags(INPUT)

    expect(mocks.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5-nano",
        text: { format: { type: "json_object" } },
        reasoning: { effort: "minimal" },
        store: false,
        instructions: expect.any(String),
        input: expect.stringContaining("Debounce hook"),
      })
    )
  })

  it("normalizes the model's tags", async () => {
    respondWith('{"tags":["React","  HOOKS  ","react"]}')

    expect(await generateAutoTags(INPUT)).toEqual({
      success: true,
      data: { tags: ["react", "hooks"] },
    })
  })

  it("reports unusable model output as a failure", async () => {
    respondWith("I'm not going to answer that")

    const result = await generateAutoTags(INPUT)

    expect(result.success).toBe(false)
    expect(result).toMatchObject({ error: expect.stringContaining("Couldn't suggest") })
  })

  it("names a quota failure instead of inviting a pointless retry", async () => {
    mocks.responses.create.mockRejectedValue(
      Object.assign(new Error("429 You exceeded your current quota"), {
        status: 429,
        code: "insufficient_quota",
        type: "insufficient_quota",
      })
    )
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await generateAutoTags(INPUT)

    expect(result).toEqual({ success: false, error: AI_QUOTA_MESSAGE })
    // The real cause must still reach the log — the toast deliberately omits it.
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("turns an OpenAI failure into a generic error", async () => {
    mocks.responses.create.mockRejectedValue(new Error("503 upstream"))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await generateAutoTags(INPUT)

    expect(result).toEqual({
      success: false,
      error: "AI tag suggestions are unavailable right now. Please try again.",
    })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe("generateAutoTags when OpenAI is unconfigured", () => {
  it("returns a configuration error instead of throwing", async () => {
    const client = await import("@/lib/ai/client")
    vi.mocked(client.aiConfigured).mockReturnValue(false)

    expect(await generateAutoTags(INPUT)).toEqual({
      success: false,
      error: "AI features are not configured.",
    })
    expect(mocks.responses.create).not.toHaveBeenCalled()

    vi.mocked(client.aiConfigured).mockReturnValue(true)
  })
})
