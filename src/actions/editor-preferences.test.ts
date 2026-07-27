import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import { updateEditorPreferences } from "@/actions/editor-preferences"
import { updateEditorPreferences as updateEditorPreferencesQuery } from "@/lib/db/editor-preferences"
import { auth } from "@/auth"
import { DEFAULT_EDITOR_PREFERENCES, type EditorPreferences } from "@/lib/editor-preferences"

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db/editor-preferences", () => ({
  updateEditorPreferences: vi.fn(),
}))

const SESSION: Session = { user: { id: "user-1" }, expires: "2099-01-01T00:00:00.000Z" }

const VALID: EditorPreferences = {
  fontSize: 16,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
  theme: "monokai",
}

describe("updateEditorPreferences (action)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects when there is no session", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const result = await updateEditorPreferences(VALID)

    expect(result).toEqual({ success: false, error: "Not authenticated" })
    expect(updateEditorPreferencesQuery).not.toHaveBeenCalled()
  })

  it("rejects input that fails schema validation", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)

    const result = await updateEditorPreferences({
      ...VALID,
      theme: "dracula" as EditorPreferences["theme"],
    })

    expect(result.success).toBe(false)
    expect(updateEditorPreferencesQuery).not.toHaveBeenCalled()
  })

  it("persists validated preferences and returns them on success", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(updateEditorPreferencesQuery).mockResolvedValue(VALID)

    const result = await updateEditorPreferences(VALID)

    expect(result).toEqual({ success: true, data: VALID })
    expect(updateEditorPreferencesQuery).toHaveBeenCalledWith("user-1", VALID)
  })

  it("returns a generic error when the query throws", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(updateEditorPreferencesQuery).mockRejectedValue(new Error("db down"))

    const result = await updateEditorPreferences(DEFAULT_EDITOR_PREFERENCES)

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    })
  })
})
