import { beforeEach, describe, expect, it, vi } from "vitest"
import { getFavoriteItems, getFavoriteCollections, getFavorites } from "@/lib/db/favorites"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      findMany: vi.fn(),
    },
    collection: {
      findMany: vi.fn(),
    },
  },
}))

// Prisma's generated method types are complex overloaded generics that don't
// play well with vi.mocked(); narrow to the shape this test actually needs.
const mockedPrisma = prisma as unknown as {
  item: { findMany: ReturnType<typeof vi.fn> }
  collection: { findMany: ReturnType<typeof vi.fn> }
}

const ITEM_ROW = {
  id: "item-1",
  title: "Debounce hook",
  updatedAt: new Date("2026-07-27T00:00:00.000Z"),
  itemType: { name: "snippet", icon: "Code", color: "#3b82f6" },
}

const COLLECTION_ROW = {
  id: "col-1",
  name: "React Patterns",
  updatedAt: new Date("2026-07-20T00:00:00.000Z"),
  _count: { items: 3 },
}

describe("getFavoriteItems", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("queries the user's favorited items, most-recently-favorited first", async () => {
    mockedPrisma.item.findMany.mockResolvedValue([ITEM_ROW])

    const result = await getFavoriteItems("user-1")

    expect(mockedPrisma.item.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isFavorite: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        itemType: { select: { name: true, icon: true, color: true } },
      },
    })
    expect(result).toEqual([ITEM_ROW])
  })
})

describe("getFavoriteCollections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("queries the user's favorited collections and flattens the item count", async () => {
    mockedPrisma.collection.findMany.mockResolvedValue([COLLECTION_ROW])

    const result = await getFavoriteCollections("user-1")

    expect(mockedPrisma.collection.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isFavorite: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        _count: { select: { items: true } },
      },
    })
    expect(result).toEqual([
      {
        id: "col-1",
        name: "React Patterns",
        updatedAt: COLLECTION_ROW.updatedAt,
        itemCount: 3,
      },
    ])
  })
})

describe("getFavorites", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns both favorited items and collections", async () => {
    mockedPrisma.item.findMany.mockResolvedValue([ITEM_ROW])
    mockedPrisma.collection.findMany.mockResolvedValue([COLLECTION_ROW])

    const result = await getFavorites("user-1")

    expect(result).toEqual({
      items: [ITEM_ROW],
      collections: [
        { id: "col-1", name: "React Patterns", updatedAt: COLLECTION_ROW.updatedAt, itemCount: 3 },
      ],
    })
  })
})
