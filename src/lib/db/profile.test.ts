import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAccountSettings } from "@/lib/db/profile"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

// Prisma's generated method types are complex overloaded generics that don't
// play well with vi.mocked(); narrow to the shape this test actually needs.
const mockedPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> }
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