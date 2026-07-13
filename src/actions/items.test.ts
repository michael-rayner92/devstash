import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import { createItem, deleteItem, updateItem } from "@/actions/items"
import { auth } from "@/auth"
import {
  createItem as createItemQuery,
  deleteItem as deleteItemQuery,
  updateItem as updateItemQuery,
} from "@/lib/db/items"
import type { ItemDetail } from "@/lib/db/items"
import { deleteFromR2 } from "@/lib/r2"

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db/items", () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}))

vi.mock("@/lib/r2", () => ({
  deleteFromR2: vi.fn(),
  objectKeyFromUrl: vi.fn((url: string) => url),
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

describe("createItem (action)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const VALID_CREATE_INPUT = {
    typeName: "command",
    title: "New command",
    description: null,
    content: "echo hi",
    url: null,
    language: "bash",
    tags: ["git", "danger"],
  }

  it("rejects when there is no session", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const result = await createItem(VALID_CREATE_INPUT)

    expect(result).toEqual({ success: false, error: "Not authenticated" })
    expect(vi.mocked(createItemQuery)).not.toHaveBeenCalled()
  })

  it("rejects an unknown type name", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)

    const result = await createItem({ ...VALID_CREATE_INPUT, typeName: "file" })

    expect(result.success).toBe(false)
    expect(vi.mocked(createItemQuery)).not.toHaveBeenCalled()
  })

  it("rejects an empty title", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)

    const result = await createItem({ ...VALID_CREATE_INPUT, title: "   " })

    expect(result).toEqual({ success: false, error: "Title is required" })
    expect(vi.mocked(createItemQuery)).not.toHaveBeenCalled()
  })

  it("requires a URL when the type is link", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)

    const result = await createItem({ ...VALID_CREATE_INPUT, typeName: "link", url: null })

    expect(result).toEqual({ success: false, error: "URL is required" })
    expect(vi.mocked(createItemQuery)).not.toHaveBeenCalled()
  })

  it("normalizes input (trims, drops empties, dedupes tags) before calling the query", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(createItemQuery).mockResolvedValue(UPDATED_DETAIL)

    await createItem({
      typeName: "command",
      title: "  Padded title  ",
      description: "   ",
      content: "keep  spacing",
      url: null,
      language: "  ts  ",
      tags: ["git", " git ", "", "shell"],
    })

    expect(vi.mocked(createItemQuery)).toHaveBeenCalledWith("user-1", {
      typeName: "command",
      title: "Padded title",
      description: null,
      content: "keep  spacing",
      language: "ts",
      url: null,
      tags: ["git", "shell"],
    })
  })

  it("returns an error when the query reports an invalid type", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(createItemQuery).mockResolvedValue(null)

    const result = await createItem(VALID_CREATE_INPUT)

    expect(result).toEqual({ success: false, error: "Invalid item type" })
  })

  it("returns the created detail on success", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(createItemQuery).mockResolvedValue(UPDATED_DETAIL)

    const result = await createItem(VALID_CREATE_INPUT)

    expect(result).toEqual({ success: true, data: UPDATED_DETAIL })
  })

  it("returns a generic error when the query throws", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(createItemQuery).mockRejectedValue(new Error("db down"))

    const result = await createItem(VALID_CREATE_INPUT)

    expect(result).toEqual({ success: false, error: "Something went wrong. Please try again." })
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
    vi.mocked(deleteItemQuery).mockResolvedValue({ fileUrl: null })

    await deleteItem("item-1")

    expect(vi.mocked(deleteItemQuery)).toHaveBeenCalledWith("user-1", "item-1")
  })

  it("returns not found when the query reports the item is missing/unowned", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(deleteItemQuery).mockResolvedValue(null)

    const result = await deleteItem("item-1")

    expect(result).toEqual({ success: false, error: "Item not found" })
  })

  it("returns success and skips R2 cleanup for a text item (no fileUrl)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(deleteItemQuery).mockResolvedValue({ fileUrl: null })

    const result = await deleteItem("item-1")

    expect(result).toEqual({ success: true })
    expect(vi.mocked(deleteFromR2)).not.toHaveBeenCalled()
  })

  it("deletes the R2 object when the deleted item had a file", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(deleteItemQuery).mockResolvedValue({
      fileUrl: "https://cdn.example.com/user-1/abc.png",
    })

    const result = await deleteItem("item-1")

    expect(result).toEqual({ success: true })
    expect(vi.mocked(deleteFromR2)).toHaveBeenCalledWith(
      "https://cdn.example.com/user-1/abc.png"
    )
  })

  it("still succeeds when R2 cleanup throws (orphan, not a user error)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(deleteItemQuery).mockResolvedValue({
      fileUrl: "https://cdn.example.com/user-1/abc.png",
    })
    vi.mocked(deleteFromR2).mockRejectedValueOnce(new Error("R2 down"))

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
