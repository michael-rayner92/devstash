import { beforeEach, describe, expect, it, vi } from "vitest"
import { createCollection } from "@/lib/db/collections"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    collection: {
      create: vi.fn(),
    },
  },
}))

// Prisma's generated method types are complex overloaded generics that don't
// play well with vi.mocked(); narrow to the shape this test actually needs.
const mockedPrisma = prisma as unknown as {
  collection: {
    create: ReturnType<typeof vi.fn>
  }
}

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
