import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAccountSettings, getProfileData } from "@/lib/db/profile"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    item: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    collection: {
      count: vi.fn(),
    },
    itemType: {
      findMany: vi.fn(),
    },
  },
}))

// Prisma's generated method types are complex overloaded generics that don't
// play well with vi.mocked(); narrow to the shape this test actually needs.
const mockedPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> }
  item: { count: ReturnType<typeof vi.fn>; groupBy: ReturnType<typeof vi.fn> }
  collection: { count: ReturnType<typeof vi.fn> }
  itemType: { findMany: ReturnType<typeof vi.fn> }
}

describe("getAccountSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("scopes the query to the user and only selects the password field", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ password: "hashed" })

    await getAccountSettings("user-1")

    expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { password: true },
    })
  })

  it("returns hasPassword: true when the user has a password", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ password: "hashed" })

    expect(await getAccountSettings("user-1")).toEqual({ hasPassword: true })
  })

  it("returns hasPassword: false for GitHub-only accounts (no password)", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ password: null })

    expect(await getAccountSettings("user-1")).toEqual({ hasPassword: false })
  })

  it("returns null when the user does not exist", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null)

    expect(await getAccountSettings("missing")).toBeNull()
  })
})

describe("getProfileData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedPrisma.item.count.mockResolvedValue(0)
    mockedPrisma.collection.count.mockResolvedValue(0)
    mockedPrisma.item.groupBy.mockResolvedValue([])
    mockedPrisma.itemType.findMany.mockResolvedValue([])
  })

  function mockUser(isPro: boolean) {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Demo",
      email: "demo@devstash.io",
      image: null,
      password: "hashed",
      isPro,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    })
  }

  it("selects isPro so the profile can render the plan badge", async () => {
    mockUser(false)

    await getProfileData("user-1")

    expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: expect.objectContaining({ isPro: true }),
    })
  })

  it("returns the user's plan", async () => {
    mockUser(true)
    expect(await getProfileData("user-1")).toMatchObject({ isPro: true })

    mockUser(false)
    expect(await getProfileData("user-1")).toMatchObject({ isPro: false })
  })
})