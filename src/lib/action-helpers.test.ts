import { describe, it, expect, vi, beforeEach } from "vitest"
import { z } from "zod"
import { auth } from "@/auth"
import {
  GENERIC_ACTION_ERROR,
  firstIssueMessage,
  requireSession,
  trimmedOrNull,
} from "./action-helpers"

vi.mock("@/auth", () => ({ auth: vi.fn() }))

const mockAuth = vi.mocked(auth)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("requireSession", () => {
  it("returns the full session when the user is signed in", async () => {
    const session = { user: { id: "user-1", email: "a@b.com", isPro: false } }
    mockAuth.mockResolvedValue(session as unknown as Awaited<ReturnType<typeof auth>>)

    // The whole session comes back, not just the id — `createCheckoutSession`
    // reads `session.user.email` after the guard.
    await expect(requireSession()).resolves.toBe(session)
  })

  it("returns null when there is no session", async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>)

    await expect(requireSession()).resolves.toBeNull()
  })

  it("returns null when the session carries no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} } as unknown as Awaited<ReturnType<typeof auth>>)

    await expect(requireSession()).resolves.toBeNull()
  })
})

describe("firstIssueMessage", () => {
  const schema = z.object({
    title: z.string().min(1, "Title is required"),
  })

  it("returns the first issue's message", () => {
    const parsed = schema.safeParse({ title: "" })
    expect(parsed.success).toBe(false)
    if (parsed.success) return

    expect(firstIssueMessage(parsed.error)).toBe("Title is required")
  })

  it("falls back to 'Invalid input' when an error carries no issues", () => {
    expect(firstIssueMessage({ issues: [] } as unknown as z.ZodError)).toBe("Invalid input")
  })

  it("accepts a custom fallback", () => {
    const error = { issues: [] } as unknown as z.ZodError
    expect(firstIssueMessage(error, "Nope")).toBe("Nope")
  })
})

describe("trimmedOrNull", () => {
  it("trims surrounding whitespace", () => {
    expect(trimmedOrNull("  hello  ")).toBe("hello")
  })

  it("collapses an empty or whitespace-only string to null", () => {
    expect(trimmedOrNull("")).toBeNull()
    expect(trimmedOrNull("   ")).toBeNull()
  })

  it("leaves non-strings alone", () => {
    expect(trimmedOrNull(null)).toBeNull()
    expect(trimmedOrNull(undefined)).toBeUndefined()
    expect(trimmedOrNull(42)).toBe(42)
  })
})

describe("GENERIC_ACTION_ERROR", () => {
  it("is the wording the actions previously inlined", () => {
    expect(GENERIC_ACTION_ERROR).toBe("Something went wrong. Please try again.")
  })
})
