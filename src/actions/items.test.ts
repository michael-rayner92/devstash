import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import { deleteItem, updateItem } from "@/actions/items"
import { auth } from "@/auth"
import {
  deleteItem as deleteItemQuery,
  updateItem as updateItemQuery,
} from "@/lib/db/items"
import type { ItemDetail } from "@/lib/db/items"

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db/items", () => ({
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}))

const SESSION: Session = { user: { id: "user-1" }, expires: "2099-01-01T00:00:00.000Z" }

const VALID_INPUT = {
  title: "Reset local branch",
  description: "Nuke local changes",
  content: "git reset --hard",
  url: null,
  language: "bash",
  tags: ["git", "danger"],
}

// Minimal ItemDetail returned by the (mocked) query on success.
const UPDATED_DETAIL = {
  id: "item-1",
  title: "Reset local branch",
  tags: [{ id: "t1", name: "git" }],
} as unknown as ItemDetail

describe("updateItem (action)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects when there is no session", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const result = await updateItem("item-1", VALID_INPUT)

    expect(result).toEqual({ success: false, error: "Not authenticated" })
    expect(vi.mocked(updateItemQuery)).not.toHaveBeenCalled()
  })

  it("rejects an empty title", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)

    const result = await updateItem("item-1", { ...VALID_INPUT, title: "   " })

    expect(result).toEqual({ success: false, error: "Title is required" })
    expect(vi.mocked(updateItemQuery)).not.toHaveBeenCalled()
  })

  it("rejects an invalid URL", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)

    const result = await updateItem("item-1", { ...VALID_INPUT, url: "not-a-url" })

    expect(result).toEqual({ success: false, error: "Enter a valid URL" })
    expect(vi.mocked(updateItemQuery)).not.toHaveBeenCalled()
  })

  it("normalizes input (trims, drops empties, dedupes tags) before calling the query", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(updateItemQuery).mockResolvedValue(UPDATED_DETAIL)

    await updateItem("item-1", {
      title: "  Padded title  ",
      description: "   ",
      content: "keep  spacing",
      url: null,
      language: "  ts  ",
      tags: ["git", " git ", "", "shell"],
    })

    expect(vi.mocked(updateItemQuery)).toHaveBeenCalledWith("user-1", "item-1", {
      title: "Padded title",
      description: null,
      content: "keep  spacing",
      language: "ts",
      url: null,
      tags: ["git", "shell"],
    })
  })

  it("returns not found when the query reports the item is missing/unowned", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(updateItemQuery).mockResolvedValue(null)

    const result = await updateItem("item-1", VALID_INPUT)

    expect(result).toEqual({ success: false, error: "Item not found" })
  })

  it("returns the updated detail on success", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(updateItemQuery).mockResolvedValue(UPDATED_DETAIL)

    const result = await updateItem("item-1", VALID_INPUT)

    expect(result).toEqual({ success: true, data: UPDATED_DETAIL })
  })
})

describe("deleteItem (action)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects when there is no session", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const result = await deleteItem("item-1")

    expect(result).toEqual({ success: false, error: "Not authenticated" })
    expect(vi.mocked(deleteItemQuery)).not.toHaveBeenCalled()
  })

  it("passes the session user id and item id to the query", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(deleteItemQuery).mockResolvedValue(true)

    await deleteItem("item-1")

    expect(vi.mocked(deleteItemQuery)).toHaveBeenCalledWith("user-1", "item-1")
  })

  it("returns not found when the query reports the item is missing/unowned", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(deleteItemQuery).mockResolvedValue(false)

    const result = await deleteItem("item-1")

    expect(result).toEqual({ success: false, error: "Item not found" })
  })

  it("returns success when the item is deleted", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(deleteItemQuery).mockResolvedValue(true)

    const result = await deleteItem("item-1")

    expect(result).toEqual({ success: true })
  })

  it("returns a generic error when the query throws", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(deleteItemQuery).mockRejectedValue(new Error("db down"))

    const result = await deleteItem("item-1")

    expect(result).toEqual({ success: false, error: "Something went wrong. Please try again." })
  })
})
