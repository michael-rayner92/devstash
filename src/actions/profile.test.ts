import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import { changePassword, deleteAccount } from "@/actions/profile"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

const SESSION: Session = { user: { id: "user-1" }, expires: "2099-01-01T00:00:00.000Z" }

// Prisma's generated method types are complex overloaded generics that don't
// play well with vi.mocked(); narrow to the shape this test actually needs.
const mockedPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
}

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return formData
}

const VALID_FIELDS = {
  currentPassword: "old-password",
  newPassword: "new-password-1",
  confirmPassword: "new-password-1",
}

describe("changePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects when there is no session", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const result = await changePassword({}, buildFormData(VALID_FIELDS))

    expect(result).toEqual({ error: "Not authenticated" })
    expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled()
  })

  it("rejects input that fails schema validation", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)

    const result = await changePassword(
      {},
      buildFormData({ ...VALID_FIELDS, newPassword: "short", confirmPassword: "short" })
    )

    expect(result).toEqual({ error: "New password must be at least 8 characters" })
  })

  it("rejects when new and confirm passwords differ", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)

    const result = await changePassword(
      {},
      buildFormData({ ...VALID_FIELDS, confirmPassword: "a-different-password" })
    )

    expect(result).toEqual({ error: "New passwords do not match" })
  })

  it("rejects accounts with no password set (OAuth-only)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    mockedPrisma.user.findUnique.mockResolvedValue({ password: null })

    const result = await changePassword({}, buildFormData(VALID_FIELDS))

    expect(result).toEqual({ error: "No password set on this account" })
  })

  it("rejects an incorrect current password", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    mockedPrisma.user.findUnique.mockResolvedValue({ password: "hashed-old-password" })
    vi.mocked(bcrypt.compare).mockResolvedValue(false)

    const result = await changePassword({}, buildFormData(VALID_FIELDS))

    expect(result).toEqual({ error: "Current password is incorrect" })
    expect(mockedPrisma.user.update).not.toHaveBeenCalled()
  })

  it("hashes and saves the new password on success", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    mockedPrisma.user.findUnique.mockResolvedValue({ password: "hashed-old-password" })
    vi.mocked(bcrypt.compare).mockResolvedValue(true)
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-new-password")

    const result = await changePassword({}, buildFormData(VALID_FIELDS))

    expect(result).toEqual({ success: true })
    expect(bcrypt.hash).toHaveBeenCalledWith(VALID_FIELDS.newPassword, 12)
    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { password: "hashed-new-password", passwordChangedAt: expect.any(Date) },
    })
  })
})

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects when there is no session", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const result = await deleteAccount()

    expect(result).toEqual({ error: "Not authenticated" })
    expect(mockedPrisma.user.delete).not.toHaveBeenCalled()
  })

  it("deletes the user and redirects when authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)

    await deleteAccount()

    expect(mockedPrisma.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } })
    expect(redirect).toHaveBeenCalledWith("/sign-in?deleted=1")
  })
})
