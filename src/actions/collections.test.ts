import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import { createCollection } from "@/actions/collections"
import { auth } from "@/auth"
import { createCollection as createCollectionQuery } from "@/lib/db/collections"
import type { CollectionSummary } from "@/lib/db/collections"

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db/collections", () => ({
  createCollection: vi.fn(),
}))

const SESSION: Session = { user: { id: "user-1" }, expires: "2099-01-01T00:00:00.000Z" }

const VALID_INPUT = {
  name: "React Patterns",
  description: "Reusable component recipes",
}

// Minimal CollectionSummary returned by the (mocked) query on success.
const CREATED: CollectionSummary = {
  id: "col-1",
  name: "React Patterns",
  description: "Reusable component recipes",
  isFavorite: false,
  updatedAt: "2026-07-20T00:00:00.000Z",
}

describe("createCollection (action)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects when there is no session", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const result = await createCollection(VALID_INPUT)

    expect(result).toEqual({ success: false, error: "Not authenticated" })
    expect(vi.mocked(createCollectionQuery)).not.toHaveBeenCalled()
  })

  it("rejects an empty name", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)

    const result = await createCollection({ ...VALID_INPUT, name: "   " })

    expect(result).toEqual({ success: false, error: "Name is required" })
    expect(vi.mocked(createCollectionQuery)).not.toHaveBeenCalled()
  })

  it("normalizes input (trims name, drops empty description) before calling the query", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(createCollectionQuery).mockResolvedValue(CREATED)

    await createCollection({ name: "  Padded name  ", description: "   " })

    expect(vi.mocked(createCollectionQuery)).toHaveBeenCalledWith("user-1", {
      name: "Padded name",
      description: null,
    })
  })

  it("returns the created collection on success", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(createCollectionQuery).mockResolvedValue(CREATED)

    const result = await createCollection(VALID_INPUT)

    expect(result).toEqual({ success: true, data: CREATED })
  })

  it("returns a generic error when the query throws", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(createCollectionQuery).mockRejectedValue(new Error("db down"))

    const result = await createCollection(VALID_INPUT)

    expect(result).toEqual({ success: false, error: "Something went wrong. Please try again." })
  })
})
