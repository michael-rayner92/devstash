import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createCollection,
  getCollections,
  getCollectionWithItems,
} from "@/lib/db/collections"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    collection: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

// Prisma's generated method types are complex overloaded generics that don't
// play well with vi.mocked(); narrow to the shape this test actually needs.
const mockedPrisma = prisma as unknown as {
  collection: {
    create: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
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

describe("getCollections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("scopes to the user and maps each row to stats (count + dominant type)", async () => {
    mockedPrisma.collection.findMany.mockResolvedValue([
      {
        ...COLLECTION_ROW,
        items: [{ item: { itemType: ITEM_TYPE } }, { item: { itemType: ITEM_TYPE } }],
      },
    ])

    const result = await getCollections("user-1")

    expect(mockedPrisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: "col-1",
      name: "React Patterns",
      itemCount: 2,
      dominantType: ITEM_TYPE,
    })
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

  it("returns the collection meta plus its items flattened to ItemWithType", async () => {
    const item = { id: "item-1", title: "useDebounce", itemType: ITEM_TYPE, tags: [] }
    mockedPrisma.collection.findFirst.mockResolvedValue({
      ...COLLECTION_ROW,
      items: [{ item }],
    })

    const result = await getCollectionWithItems("user-1", "col-1")

    expect(result).toEqual({
      id: "col-1",
      name: "React Patterns",
      description: "Reusable component recipes",
      isFavorite: false,
      updatedAt: new Date("2026-07-20T00:00:00.000Z"),
      items: [item],
    })
  })
})
