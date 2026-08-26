import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import {
  explainCode,
  generateAutoTags,
  generateDescription,
  optimizePrompt,
} from "@/actions/ai"
import { auth } from "@/auth"
import { AI_QUOTA_MESSAGE } from "@/lib/ai/errors"
import { getIsPro } from "@/lib/db/billing"
import { getItemForExplain, getItemForOptimize } from "@/lib/db/items"
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
vi.mock("@/lib/db/items", () => ({
  getItemForExplain: vi.fn(),
  getItemForOptimize: vi.fn(),
}))
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  retryAfterMinutes: vi.fn(() => 17),
}))

const SESSION: Session = {
  user: { id: "user-1", email: "demo@devstash.io", isPro: true },
  expires: "2099-01-01T00:00:00.000Z",
}

const INPUT = { title: "Debounce hook", content: "export function useDebounce() {}" }

const EXPLAIN_INPUT = { itemId: "item-1" }

const OPTIMIZE_INPUT = { itemId: "item-2" }

const OPTIMIZE_ITEM = {
  typeName: "prompt",
  title: "Blog post writer",
  content: "Write a blog post about {{topic}}.",
}

/** The model reply shape `parseOptimizedPrompt` expects. */
function optimizeReply(optimized: string, changes: string[] = ["Added an explicit role"]) {
  return JSON.stringify({ optimized, changes })
}

const EXPLAIN_ITEM = {
  typeName: "snippet",
  title: "Debounce hook",
  language: "typescript",
  content: "export function useDebounce() {}",
}

function respondWith(outputText: string) {
  mocks.responses.create.mockResolvedValue({ output_text: outputText })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BILLING_ENFORCED", "true")
  vi.mocked(auth).mockResolvedValue(SESSION)
  vi.mocked(getIsPro).mockResolvedValue(true)
  vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 19, reset: 0 })
  vi.mocked(getItemForExplain).mockResolvedValue(EXPLAIN_ITEM)
  vi.mocked(getItemForOptimize).mockResolvedValue(OPTIMIZE_ITEM)
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

const DESCRIPTION_INPUT = {
  typeName: "command",
  title: "Tail pod logs",
  content: "kubectl logs -f deploy/api",
  language: "shell",
  url: null,
  fileName: null,
}

describe("generateDescription", () => {
  beforeEach(() => {
    respondWith("Follows the API deployment's logs in real time via kubectl.")
  })

  it("requires a session", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    expect(await generateDescription(DESCRIPTION_INPUT)).toEqual({
      success: false,
      error: "Not authenticated",
    })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("rejects input with nothing to describe", async () => {
    const result = await generateDescription({
      typeName: "snippet",
      title: "  ",
      content: "  ",
      language: "typescript",
      url: null,
      fileName: null,
    })

    expect(result).toEqual({ success: false, error: "Add a title or some content first" })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  // Every content type must work off whatever it has: a link carries its payload
  // in `url` and a file item in `fileName`, with no body at all.
  it("accepts a link with only a url", async () => {
    const result = await generateDescription({
      typeName: "link",
      title: "",
      content: null,
      language: null,
      url: "https://nextjs.org/docs/app",
      fileName: null,
    })

    expect(result.success).toBe(true)
    expect(mocks.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.stringContaining("https://nextjs.org/docs/app") })
    )
  })

  it("accepts a file item with only a file name", async () => {
    const result = await generateDescription({
      typeName: "file",
      title: "",
      content: null,
      language: null,
      url: null,
      fileName: "architecture.md",
    })

    expect(result.success).toBe(true)
    expect(mocks.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.stringContaining("architecture.md") })
    )
  })

  it("blocks free users under enforcement before spending a call", async () => {
    vi.mocked(getIsPro).mockResolvedValue(false)

    const result = await generateDescription(DESCRIPTION_INPUT)

    expect(result.success).toBe(false)
    expect(result).toMatchObject({ error: expect.stringContaining("Pro") })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("allows free users when billing enforcement is off", async () => {
    vi.stubEnv("BILLING_ENFORCED", "false")
    vi.mocked(getIsPro).mockResolvedValue(false)

    expect(await generateDescription(DESCRIPTION_INPUT)).toEqual({
      success: true,
      data: { description: "Follows the API deployment's logs in real time via kubectl." },
    })
  })

  it("reports a missing account rather than calling OpenAI", async () => {
    vi.mocked(getIsPro).mockResolvedValue(null)

    expect(await generateDescription(DESCRIPTION_INPUT)).toEqual({
      success: false,
      error: "Account not found",
    })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("shares the tag feature's per-user rate limit", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 17 * 60_000,
    })

    const result = await generateDescription(DESCRIPTION_INPUT)

    expect(checkRateLimit).toHaveBeenCalledWith("ai", "ai:user-1")
    expect(result).toEqual({
      success: false,
      error: "You've used all your AI requests for now. Try again in 17 minutes.",
    })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  // Plain text, unlike tag suggestion — asking for `json_object` would also
  // require the word "json" in the input, which this prompt has no use for.
  it("calls the Responses API without a json format and opts out of retention", async () => {
    await generateDescription(DESCRIPTION_INPUT)

    const call = mocks.responses.create.mock.calls[0][0]
    expect(call).toEqual(
      expect.objectContaining({
        model: "gpt-5-nano",
        reasoning: { effort: "minimal" },
        store: false,
        instructions: expect.any(String),
        input: expect.stringContaining("Tail pod logs"),
      })
    )
    expect(call).not.toHaveProperty("text")
  })

  it("normalizes the model's output", async () => {
    respondWith('  "Description: Tails the API logs."  ')

    expect(await generateDescription(DESCRIPTION_INPUT)).toEqual({
      success: true,
      data: { description: "Tails the API logs." },
    })
  })

  it("reports unusable model output as a failure", async () => {
    respondWith("   ")

    const result = await generateDescription(DESCRIPTION_INPUT)

    expect(result.success).toBe(false)
    expect(result).toMatchObject({ error: expect.stringContaining("Couldn't write") })
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

    expect(await generateDescription(DESCRIPTION_INPUT)).toEqual({
      success: false,
      error: AI_QUOTA_MESSAGE,
    })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("turns an OpenAI failure into a generic error", async () => {
    mocks.responses.create.mockRejectedValue(new Error("503 upstream"))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await generateDescription(DESCRIPTION_INPUT)).toEqual({
      success: false,
      error: "AI descriptions are unavailable right now. Please try again.",
    })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe("explainCode", () => {
  beforeEach(() => {
    respondWith("Debounces a value.\n\n- Uses `useState`\n- Clears the timer on unmount")
  })

  it("requires a session", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    expect(await explainCode(EXPLAIN_INPUT)).toEqual({
      success: false,
      error: "Not authenticated",
    })
    expect(getItemForExplain).not.toHaveBeenCalled()
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("rejects a blank item id", async () => {
    const result = await explainCode({ itemId: "  " })

    expect(result).toEqual({ success: false, error: "Missing item" })
    expect(getItemForExplain).not.toHaveBeenCalled()
  })

  it("reads the code from the DB scoped to the caller, never from the client", async () => {
    await explainCode(EXPLAIN_INPUT)

    expect(getItemForExplain).toHaveBeenCalledWith("user-1", "item-1")
  })

  it("reports a missing or unowned item without spending a rate-limit token", async () => {
    vi.mocked(getItemForExplain).mockResolvedValue(null)

    const result = await explainCode({ itemId: "someone-elses" })

    expect(result.success).toBe(false)
    expect(result).toMatchObject({ error: expect.stringContaining("Couldn't find") })
    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("refuses a whitespace-only body, which is truthy in the DB but nothing to explain", async () => {
    vi.mocked(getItemForExplain).mockResolvedValue({ ...EXPLAIN_ITEM, content: "   \n  " })

    const result = await explainCode(EXPLAIN_INPUT)

    expect(result.success).toBe(false)
    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("refuses non-code types even though the UI never offers them", async () => {
    vi.mocked(getItemForExplain).mockResolvedValue({ ...EXPLAIN_ITEM, typeName: "note" })

    const result = await explainCode(EXPLAIN_INPUT)

    expect(result).toEqual({
      success: false,
      error: "Only snippets and commands can be explained.",
    })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("blocks free users under enforcement before spending a call", async () => {
    vi.mocked(getIsPro).mockResolvedValue(false)

    const result = await explainCode(EXPLAIN_INPUT)

    expect(result.success).toBe(false)
    expect(result).toMatchObject({ error: expect.stringContaining("Pro") })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("allows free users when billing enforcement is off", async () => {
    vi.stubEnv("BILLING_ENFORCED", "false")
    vi.mocked(getIsPro).mockResolvedValue(false)

    expect((await explainCode(EXPLAIN_INPUT)).success).toBe(true)
  })

  it("fails when the account no longer exists", async () => {
    vi.mocked(getIsPro).mockResolvedValue(null)

    expect(await explainCode(EXPLAIN_INPUT)).toEqual({
      success: false,
      error: "Account not found",
    })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("shares the AI rate limit with the other AI actions", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: 0 })

    const result = await explainCode(EXPLAIN_INPUT)

    expect(checkRateLimit).toHaveBeenCalledWith("ai", "ai:user-1")
    expect(result).toMatchObject({ success: false, error: expect.stringContaining("17 minutes") })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("asks for markdown, not JSON, and opts out of retention", async () => {
    await explainCode(EXPLAIN_INPUT)

    const request = mocks.responses.create.mock.calls[0][0]
    expect(request).toMatchObject({ store: false, reasoning: { effort: "low" } })
    expect(request.text).toBeUndefined()
    expect(request.input).toContain("export function useDebounce() {}")
    expect(request.max_output_tokens).toBeGreaterThan(0)
  })

  it("returns the normalized explanation", async () => {
    respondWith("```markdown\nDebounces a value.\n```")

    expect(await explainCode(EXPLAIN_INPUT)).toEqual({
      success: true,
      data: { explanation: "Debounces a value." },
    })
  })

  it("reports unusable model output as a failure", async () => {
    respondWith("   ")

    const result = await explainCode(EXPLAIN_INPUT)

    expect(result.success).toBe(false)
    expect(result).toMatchObject({ error: expect.stringContaining("Couldn't explain") })
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

    expect(await explainCode(EXPLAIN_INPUT)).toEqual({
      success: false,
      error: AI_QUOTA_MESSAGE,
    })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("turns an OpenAI failure into a generic error", async () => {
    mocks.responses.create.mockRejectedValue(new Error("503 upstream"))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await explainCode(EXPLAIN_INPUT)).toEqual({
      success: false,
      error: "AI explanations are unavailable right now. Please try again.",
    })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe("optimizePrompt", () => {
  beforeEach(() => {
    respondWith(optimizeReply("You are a technical writer. Write about {{topic}}."))
  })

  it("requires a session", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    expect(await optimizePrompt(OPTIMIZE_INPUT)).toEqual({
      success: false,
      error: "Not authenticated",
    })
    expect(getItemForOptimize).not.toHaveBeenCalled()
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("rejects a blank item id", async () => {
    const result = await optimizePrompt({ itemId: "  " })

    expect(result).toEqual({ success: false, error: "Missing item" })
    expect(getItemForOptimize).not.toHaveBeenCalled()
  })

  it("reads the prompt from the DB scoped to the caller, never from the client", async () => {
    await optimizePrompt(OPTIMIZE_INPUT)

    expect(getItemForOptimize).toHaveBeenCalledWith("user-1", "item-2")
  })

  it("reports a missing or unowned item without spending a rate-limit token", async () => {
    vi.mocked(getItemForOptimize).mockResolvedValue(null)

    const result = await optimizePrompt({ itemId: "someone-elses" })

    expect(result.success).toBe(false)
    expect(result).toMatchObject({ error: expect.stringContaining("Couldn't find") })
    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("refuses a whitespace-only body, which is truthy in the DB but nothing to rewrite", async () => {
    vi.mocked(getItemForOptimize).mockResolvedValue({ ...OPTIMIZE_ITEM, content: "  \n  " })

    const result = await optimizePrompt(OPTIMIZE_INPUT)

    expect(result.success).toBe(false)
    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  /**
   * Notes share the markdown editor with prompts, so this is the case a
   * too-broad `isMarkdownType` gate would wrongly let through.
   */
  it("refuses non-prompt types, including notes", async () => {
    for (const typeName of ["note", "snippet", "link"]) {
      vi.mocked(getItemForOptimize).mockResolvedValue({ ...OPTIMIZE_ITEM, typeName })

      expect(await optimizePrompt(OPTIMIZE_INPUT)).toEqual({
        success: false,
        error: "Only prompts can be optimized.",
      })
    }
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("blocks free users under enforcement before spending a call", async () => {
    vi.mocked(getIsPro).mockResolvedValue(false)

    const result = await optimizePrompt(OPTIMIZE_INPUT)

    expect(result.success).toBe(false)
    expect(result).toMatchObject({ error: expect.stringContaining("Pro") })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("allows free users when billing enforcement is off", async () => {
    vi.stubEnv("BILLING_ENFORCED", "false")
    vi.mocked(getIsPro).mockResolvedValue(false)

    expect((await optimizePrompt(OPTIMIZE_INPUT)).success).toBe(true)
  })

  it("fails when the account no longer exists", async () => {
    vi.mocked(getIsPro).mockResolvedValue(null)

    expect(await optimizePrompt(OPTIMIZE_INPUT)).toEqual({
      success: false,
      error: "Account not found",
    })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("shares the AI rate limit with the other AI actions", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: 0 })

    const result = await optimizePrompt(OPTIMIZE_INPUT)

    expect(checkRateLimit).toHaveBeenCalledWith("ai", "ai:user-1")
    expect(result).toMatchObject({ success: false, error: expect.stringContaining("17 minutes") })
    expect(mocks.responses.create).not.toHaveBeenCalled()
  })

  it("asks for JSON, mentions json in the input, and opts out of retention", async () => {
    await optimizePrompt(OPTIMIZE_INPUT)

    const request = mocks.responses.create.mock.calls[0][0]
    expect(request).toMatchObject({
      store: false,
      reasoning: { effort: "low" },
      text: { format: { type: "json_object" } },
    })
    expect(request.input).toContain("Write a blog post about {{topic}}.")
    // Required by the API whenever `json_object` is used — see buildOptimizeInput.
    expect(request.input.toLowerCase()).toContain("json")
    expect(request.max_output_tokens).toBeGreaterThan(0)
  })

  it("returns the rewrite and its rationale", async () => {
    expect(await optimizePrompt(OPTIMIZE_INPUT)).toEqual({
      success: true,
      data: {
        optimized: "You are a technical writer. Write about {{topic}}.",
        changes: ["Added an explicit role"],
        unchanged: false,
      },
    })
  })

  it("succeeds with unchanged set when the prompt was already good", async () => {
    respondWith(optimizeReply(OPTIMIZE_ITEM.content, []))

    expect(await optimizePrompt(OPTIMIZE_INPUT)).toEqual({
      success: true,
      data: { optimized: OPTIMIZE_ITEM.content, changes: [], unchanged: true },
    })
  })

  it("reports unusable model output as a failure", async () => {
    respondWith("Sure, here's a better prompt!")

    const result = await optimizePrompt(OPTIMIZE_INPUT)

    expect(result.success).toBe(false)
    expect(result).toMatchObject({ error: expect.stringContaining("Couldn't optimize") })
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

    expect(await optimizePrompt(OPTIMIZE_INPUT)).toEqual({
      success: false,
      error: AI_QUOTA_MESSAGE,
    })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("turns an OpenAI failure into a generic error", async () => {
    mocks.responses.create.mockRejectedValue(new Error("503 upstream"))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await optimizePrompt(OPTIMIZE_INPUT)).toEqual({
      success: false,
      error: "AI prompt optimization is unavailable right now. Please try again.",
    })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe("generateDescription when OpenAI is unconfigured", () => {
  it("returns a configuration error instead of throwing", async () => {
    const client = await import("@/lib/ai/client")
    vi.mocked(client.aiConfigured).mockReturnValue(false)

    expect(await generateDescription(DESCRIPTION_INPUT)).toEqual({
      success: false,
      error: "AI features are not configured.",
    })
    expect(mocks.responses.create).not.toHaveBeenCalled()

    vi.mocked(client.aiConfigured).mockReturnValue(true)
  })
})
