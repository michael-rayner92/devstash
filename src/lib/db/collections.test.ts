import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createCollection,
  updateCollection,
  deleteCollection,
  getCollections,
  getCollectionWithItems,
} from "@/lib/db/collections"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    collection: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    itemCollection: {
      findMany: vi.fn(),
    },
  },
}))

// Prisma's generated method types are complex overloaded generics that don't
// play well with vi.mocked(); narrow to the shape this test actually needs.
const mockedPrisma = prisma as unknown as {
  collection: {
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
  }
  itemCollection: {
    findMany: ReturnType<typeof vi.fn>
  }
}

const ITEM_TYPE = { id: "type-1", name: "snippet", icon: "Code", color: "#3b82f6" }

const COLLECTION_ROW = {
  id: "col-1",
  name: "React Patterns",
  description: "Reusable component recipes",
  isFavorite: false,
  updatedAt: new Date("2026-07-20T00:00:00.000Z"),
}

describe("createCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a collection scoped to the user and returns the serialized summary", async () => {
    mockedPrisma.collection.create.mockResolvedValue(COLLECTION_ROW)

    const result = await createCollection("user-1", {
      name: "React Patterns",
      description: "Reusable component recipes",
    })

    expect(mockedPrisma.collection.create).toHaveBeenCalledWith({
      data: {
        name: "React Patterns",
        description: "Reusable component recipes",
        userId: "user-1",
      },
    })
    expect(result).toEqual({
      id: "col-1",
      name: "React Patterns",
      description: "Reusable component recipes",
      isFavorite: false,
      updatedAt: "2026-07-20T00:00:00.000Z",
    })
  })

  it("persists a null description", async () => {
    mockedPrisma.collection.create.mockResolvedValue({ ...COLLECTION_ROW, description: null })

    const result = await createCollection("user-1", { name: "React Patterns", description: null })

    expect(mockedPrisma.collection.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ description: null }) })
    )
    expect(result.description).toBeNull()
  })
})

describe("updateCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null when the collection is missing or not owned by the user", async () => {
    mockedPrisma.collection.findFirst.mockResolvedValue(null)

    const result = await updateCollection("user-1", "col-x", {
      name: "Renamed",
      description: null,
    })

    expect(mockedPrisma.collection.findFirst).toHaveBeenCalledWith({
      where: { id: "col-x", userId: "user-1" },
      select: { id: true },
    })
    expect(mockedPrisma.collection.update).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it("updates name + description and returns the serialized summary", async () => {
    mockedPrisma.collection.findFirst.mockResolvedValue({ id: "col-1" })
    mockedPrisma.collection.update.mockResolvedValue({
      ...COLLECTION_ROW,
      name: "Renamed",
      description: "New description",
    })

    const result = await updateCollection("user-1", "col-1", {
      name: "Renamed",
      description: "New description",
    })

    expect(mockedPrisma.collection.update).toHaveBeenCalledWith({
      where: { id: "col-1" },
      data: { name: "Renamed", description: "New description" },
    })
    expect(result).toEqual({
      id: "col-1",
      name: "Renamed",
      description: "New description",
      isFavorite: false,
      updatedAt: "2026-07-20T00:00:00.000Z",
    })
  })
})

describe("deleteCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns false and does not delete when not owned/found", async () => {
    mockedPrisma.collection.findFirst.mockResolvedValue(null)

    const result = await deleteCollection("user-1", "col-x")

    expect(mockedPrisma.collection.findFirst).toHaveBeenCalledWith({
      where: { id: "col-x", userId: "user-1" },
      select: { id: true },
    })
    expect(mockedPrisma.collection.delete).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  it("deletes the owned collection and returns true (items are left untouched)", async () => {
    mockedPrisma.collection.findFirst.mockResolvedValue({ id: "col-1" })
    mockedPrisma.collection.delete.mockResolvedValue(COLLECTION_ROW)

    const result = await deleteCollection("user-1", "col-1")

    expect(mockedPrisma.collection.delete).toHaveBeenCalledWith({ where: { id: "col-1" } })
    expect(result).toBe(true)
  })
})

describe("getCollections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("scopes to the user, paginates, and maps each row to stats (count + dominant type)", async () => {
    mockedPrisma.collection.count.mockResolvedValue(1)
    mockedPrisma.collection.findMany.mockResolvedValue([
      {
        ...COLLECTION_ROW,
        items: [{ item: { itemType: ITEM_TYPE } }, { item: { itemType: ITEM_TYPE } }],
      },
    ])

    const result = await getCollections("user-1")

    expect(mockedPrisma.collection.count).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(mockedPrisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, skip: 0, take: 21 })
    )
    expect(result.totalCount).toBe(1)
    expect(result.page).toBe(1)
    expect(result.totalPages).toBe(1)
    expect(result.collections).toHaveLength(1)
    expect(result.collections[0]).toMatchObject({
      id: "col-1",
      name: "React Patterns",
      itemCount: 2,
      dominantType: ITEM_TYPE,
    })
  })

  it("clamps an out-of-range page to the last page and skips accordingly", async () => {
    mockedPrisma.collection.count.mockResolvedValue(25) // 2 pages at 21/page
    mockedPrisma.collection.findMany.mockResolvedValue([])

    const result = await getCollections("user-1", 99)

    expect(result.totalPages).toBe(2)
    expect(result.page).toBe(2)
    expect(mockedPrisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 21, take: 21 })
    )
  })
})

describe("getCollectionWithItems", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null when the collection is missing or not owned by the user", async () => {
    mockedPrisma.collection.findFirst.mockResolvedValue(null)

    const result = await getCollectionWithItems("user-1", "col-x")

    expect(mockedPrisma.collection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "col-x", userId: "user-1" } })
    )
    expect(result).toBeNull()
  })

  it("returns the collection meta plus one page of items flattened to ItemWithType", async () => {
    const item = { id: "item-1", title: "useDebounce", itemType: ITEM_TYPE, tags: [] }
    mockedPrisma.collection.findFirst.mockResolvedValue({
      ...COLLECTION_ROW,
      _count: { items: 1 },
    })
    mockedPrisma.itemCollection.findMany.mockResolvedValue([{ item }])

    const result = await getCollectionWithItems("user-1", "col-1")

    expect(mockedPrisma.itemCollection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { collectionId: "col-1" }, skip: 0, take: 21 })
    )
    expect(result).toEqual({
      id: "col-1",
      name: "React Patterns",
      description: "Reusable component recipes",
      isFavorite: false,
      updatedAt: new Date("2026-07-20T00:00:00.000Z"),
      items: [item],
      totalCount: 1,
      page: 1,
      totalPages: 1,
    })
  })

  it("does not query items when the collection is not owned/found", async () => {
    mockedPrisma.collection.findFirst.mockResolvedValue(null)

    await getCollectionWithItems("user-1", "col-x")

    expect(mockedPrisma.itemCollection.findMany).not.toHaveBeenCalled()
  })
})
