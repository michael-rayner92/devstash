import { beforeEach, describe, expect, it, vi } from "vitest"
import { getEditorPreferences, updateEditorPreferences } from "@/lib/db/editor-preferences"
import { prisma } from "@/lib/prisma"
import { DEFAULT_EDITOR_PREFERENCES, type EditorPreferences } from "@/lib/editor-preferences"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Prisma's generated method types are complex overloaded generics that don't
// play well with vi.mocked(); narrow to the shape this test actually needs.
const mockedPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

describe("getEditorPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("scopes the read to the user and selects only editorPreferences", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ editorPreferences: null })

    await getEditorPreferences("user-1")

    expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { editorPreferences: true },
    })
  })

  it("returns defaults when the user has no stored preferences", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ editorPreferences: null })

    expect(await getEditorPreferences("user-1")).toEqual(DEFAULT_EDITOR_PREFERENCES)
  })

  it("returns defaults when the user row is missing", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null)

    expect(await getEditorPreferences("user-1")).toEqual(DEFAULT_EDITOR_PREFERENCES)
  })

  it("normalizes stored partial/invalid JSON against defaults", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      editorPreferences: { fontSize: 18, theme: "bogus" },
    })

    expect(await getEditorPreferences("user-1")).toEqual({
      ...DEFAULT_EDITOR_PREFERENCES,
      fontSize: 18,
    })
  })
})

describe("updateEditorPreferences (query)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("writes the preferences to the user and returns them", async () => {
    const prefs: EditorPreferences = {
      fontSize: 14,
      tabSize: 8,
      wordWrap: true,
      minimap: true,
      theme: "github-dark",
    }
    mockedPrisma.user.update.mockResolvedValue({})

    const result = await updateEditorPreferences("user-1", prefs)

    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { editorPreferences: prefs },
    })
    expect(result).toEqual(prefs)
  })
})
