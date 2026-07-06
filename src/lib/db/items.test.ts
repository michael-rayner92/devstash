import { beforeEach, describe, expect, it, vi } from "vitest"
import { deleteItem, getItemDetail, updateItem } from "@/lib/db/items"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// Prisma's generated method types are complex overloaded generics that don't
// play well with vi.mocked(); narrow to the shape this test actually needs.
const mockedPrisma = prisma as unknown as {
  item: {
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
}

const ITEM_ROW = {
  id: "item-1",
  title: "Reset local branch to origin",
  description: "Nuke local changes and match origin exactly.",
  contentType: "text",
  content: "git fetch origin\ngit reset --hard origin/main",
  url: null,
  fileName: null,
  fileSize: null,
  language: "bash",
  isFavorite: true,
  isPinned: false,
  updatedAt: new Date("2026-06-28T10:00:00.000Z"),
  itemType: { name: "command", icon: "Terminal", color: "#f97316" },
  tags: [
    { id: "tag-1", name: "git" },
    { id: "tag-2", name: "danger" },
  ],
  collections: [
    { collection: { id: "col-1", name: "Shell Toolbox" } },
  ],
}

describe("getItemDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("scopes the query to the owning user", async () => {
    mockedPrisma.item.findFirst.mockResolvedValue(ITEM_ROW)

    await getItemDetail("user-1", "item-1")

    expect(mockedPrisma.item.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", userId: "user-1" } })
    )
  })

  it("returns null when the item is missing or not owned by the user", async () => {
    mockedPrisma.item.findFirst.mockResolvedValue(null)

    const result = await getItemDetail("user-1", "missing")

    expect(result).toBeNull()
  })

  it("maps the row to a serializable detail (ISO date, flattened collections)", async () => {
    mockedPrisma.item.findFirst.mockResolvedValue(ITEM_ROW)

    const result = await getItemDetail("user-1", "item-1")

    expect(result).toEqual({
      id: "item-1",
      title: "Reset local branch to origin",
      description: "Nuke local changes and match origin exactly.",
      contentType: "text",
      content: "git fetch origin\ngit reset --hard origin/main",
      url: null,
      fileName: null,
      fileSize: null,
      language: "bash",
      isFavorite: true,
      isPinned: false,
      updatedAt: "2026-06-28T10:00:00.000Z",
      itemType: { name: "command", icon: "Terminal", color: "#f97316" },
      tags: [
        { id: "tag-1", name: "git" },
        { id: "tag-2", name: "danger" },
      ],
      collections: [{ id: "col-1", name: "Shell Toolbox" }],
    })
  })
})

describe("updateItem", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const UPDATE_DATA = {
    title: "Updated title",
    description: null,
    content: "echo hi",
    url: null,
    language: "bash",
    tags: ["git", "shell"],
  }

  it("returns null and skips the write when the item is not owned by the user", async () => {
    mockedPrisma.item.findFirst.mockResolvedValue(null)

    const result = await updateItem("user-1", "item-x", UPDATE_DATA)

    expect(result).toBeNull()
    expect(mockedPrisma.item.update).not.toHaveBeenCalled()
  })

  it("replaces tags (clear + connect-or-create) scoped to the user and returns the mapped detail", async () => {
    mockedPrisma.item.findFirst.mockResolvedValue({ id: "item-1" })
    mockedPrisma.item.update.mockResolvedValue({ ...ITEM_ROW, title: "Updated title" })

    const result = await updateItem("user-1", "item-1", UPDATE_DATA)

    expect(mockedPrisma.item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: expect.objectContaining({
          title: "Updated title",
          content: "echo hi",
          tags: {
            set: [],
            connectOrCreate: [
              {
                where: { userId_name: { userId: "user-1", name: "git" } },
                create: { name: "git", userId: "user-1" },
              },
              {
                where: { userId_name: { userId: "user-1", name: "shell" } },
                create: { name: "shell", userId: "user-1" },
              },
            ],
          },
        }),
      })
    )
    expect(result?.title).toBe("Updated title")
  })
})

describe("deleteItem", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns false and skips the delete when the item is not owned by the user", async () => {
    mockedPrisma.item.findFirst.mockResolvedValue(null)

    const result = await deleteItem("user-1", "item-x")

    expect(result).toBe(false)
    expect(mockedPrisma.item.delete).not.toHaveBeenCalled()
  })

  it("deletes the item scoped to its unique id and returns true when owned", async () => {
    mockedPrisma.item.findFirst.mockResolvedValue({ id: "item-1" })
    mockedPrisma.item.delete.mockResolvedValue({ id: "item-1" })

    const result = await deleteItem("user-1", "item-1")

    expect(mockedPrisma.item.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", userId: "user-1" } })
    )
    expect(mockedPrisma.item.delete).toHaveBeenCalledWith({ where: { id: "item-1" } })
    expect(result).toBe(true)
  })
})
