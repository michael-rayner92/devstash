import { beforeEach, describe, expect, it, vi } from "vitest"
import { getSearchIndex } from "@/lib/db/search"
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

const SNIPPET_TYPE = { name: "snippet", icon: "Code", color: "#3b82f6" }

describe("getSearchIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("scopes both queries to the user and maps items + collections to the search shape", async () => {
    mockedPrisma.item.findMany.mockResolvedValue([
      {
        id: "item-1",
        title: "useDebounce hook",
        description: "Debounce a value",
        content: "export function useDebounce() {}",
        url: null,
        itemType: SNIPPET_TYPE,
      },
    ])
    mockedPrisma.collection.findMany.mockResolvedValue([
      { id: "col-1", name: "React Patterns", _count: { items: 3 } },
    ])

    const result = await getSearchIndex("user-1")

    expect(mockedPrisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    )
    expect(mockedPrisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    )
    expect(result).toEqual({
      items: [
        {
          id: "item-1",
          title: "useDebounce hook",
          preview: "Debounce a value",
          type: SNIPPET_TYPE,
        },
      ],
      collections: [{ id: "col-1", name: "React Patterns", itemCount: 3 }],
    })
  })

  it("builds the item preview with description → content → url precedence and truncates to 120 chars", async () => {
    const longContent = "x".repeat(200)
    mockedPrisma.collection.findMany.mockResolvedValue([])
    mockedPrisma.item.findMany.mockResolvedValue([
      { id: "a", title: "A", description: null, content: longContent, url: "https://ex.com", itemType: SNIPPET_TYPE },
      { id: "b", title: "B", description: null, content: null, url: "https://only-url.com", itemType: SNIPPET_TYPE },
      { id: "c", title: "C", description: null, content: null, url: null, itemType: SNIPPET_TYPE },
    ])

    const result = await getSearchIndex("user-1")

    // content wins over url when description is absent, capped at 120 chars
    expect(result.items[0].preview).toBe("x".repeat(120))
    // url is the last fallback
    expect(result.items[1].preview).toBe("https://only-url.com")
    // nothing to preview → empty string
    expect(result.items[2].preview).toBe("")
  })
})
