import { beforeEach, describe, expect, it, vi } from "vitest"
import { createItem, deleteItem, getItemDetail, updateItem } from "@/lib/db/items"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    itemType: {
      findFirst: vi.fn(),
    },
  },
}))

// Prisma's generated method types are complex overloaded generics that don't
// play well with vi.mocked(); narrow to the shape this test actually needs.
const mockedPrisma = prisma as unknown as {
  item: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  itemType: {
    findFirst: ReturnType<typeof vi.fn>
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

describe("createItem", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const CREATE_DATA = {
    typeName: "command",
    title: "New command",
    description: null,
    content: "echo hi",
    url: null,
    language: "bash",
    tags: ["git", "shell"],
  }

  it("returns null and skips the write when the type name doesn't match a known system type", async () => {
    mockedPrisma.itemType.findFirst.mockResolvedValue(null)

    const result = await createItem("user-1", { ...CREATE_DATA, typeName: "bogus" })

    expect(result).toBeNull()
    expect(mockedPrisma.item.create).not.toHaveBeenCalled()
  })

  it("maps the type name to its contentType, connect-or-creates tags scoped to the user, and returns the mapped detail", async () => {
    mockedPrisma.itemType.findFirst.mockResolvedValue({ id: "type-command" })
    mockedPrisma.item.create.mockResolvedValue({ ...ITEM_ROW, title: "New command" })

    const result = await createItem("user-1", CREATE_DATA)

    expect(mockedPrisma.itemType.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: "command", isSystem: true } })
    )
    expect(mockedPrisma.item.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "New command",
          contentType: "text",
          userId: "user-1",
          itemTypeId: "type-command",
          tags: {
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
    expect(result?.title).toBe("New command")
  })

  it("maps the link type to a url contentType", async () => {
    mockedPrisma.itemType.findFirst.mockResolvedValue({ id: "type-link" })
    mockedPrisma.item.create.mockResolvedValue({ ...ITEM_ROW, contentType: "url" })

    await createItem("user-1", { ...CREATE_DATA, typeName: "link", url: "https://example.com" })

    expect(mockedPrisma.item.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ contentType: "url" }) })
    )
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
