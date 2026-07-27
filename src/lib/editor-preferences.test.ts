import { describe, expect, it } from "vitest"
import {
  DEFAULT_EDITOR_PREFERENCES,
  editorPreferencesSchema,
  normalizeEditorPreferences,
} from "@/lib/editor-preferences"

describe("normalizeEditorPreferences", () => {
  it("returns the defaults for null (no stored preferences)", () => {
    expect(normalizeEditorPreferences(null)).toEqual(DEFAULT_EDITOR_PREFERENCES)
  })

  it("returns the defaults for a non-object value", () => {
    expect(normalizeEditorPreferences("nonsense")).toEqual(DEFAULT_EDITOR_PREFERENCES)
    expect(normalizeEditorPreferences(42)).toEqual(DEFAULT_EDITOR_PREFERENCES)
  })

  it("passes through a fully valid preferences object", () => {
    const valid = {
      fontSize: 16,
      tabSize: 4,
      wordWrap: false,
      minimap: true,
      theme: "monokai",
    }
    expect(normalizeEditorPreferences(valid)).toEqual(valid)
  })

  it("fills missing fields with defaults", () => {
    expect(normalizeEditorPreferences({ theme: "github-dark" })).toEqual({
      ...DEFAULT_EDITOR_PREFERENCES,
      theme: "github-dark",
    })
  })

  it("falls back per-field when a stored value is invalid, keeping valid siblings", () => {
    const result = normalizeEditorPreferences({
      fontSize: 999, // not an allowed option -> default
      tabSize: 4, // valid -> kept
      theme: "solarized", // not an allowed theme -> default
      wordWrap: "yes", // wrong type -> default
      minimap: true, // valid -> kept
    })
    expect(result).toEqual({
      fontSize: DEFAULT_EDITOR_PREFERENCES.fontSize,
      tabSize: 4,
      wordWrap: DEFAULT_EDITOR_PREFERENCES.wordWrap,
      minimap: true,
      theme: DEFAULT_EDITOR_PREFERENCES.theme,
    })
  })

  it("produces output that always satisfies the schema", () => {
    const result = normalizeEditorPreferences({ fontSize: -1, tabSize: 3, theme: 5 })
    expect(editorPreferencesSchema.safeParse(result).success).toBe(true)
  })
})

describe("editorPreferencesSchema", () => {
  it("rejects a font size outside the allowed options", () => {
    const result = editorPreferencesSchema.safeParse({
      ...DEFAULT_EDITOR_PREFERENCES,
      fontSize: 20,
    })
    expect(result.success).toBe(false)
  })

  it("rejects an unknown theme", () => {
    const result = editorPreferencesSchema.safeParse({
      ...DEFAULT_EDITOR_PREFERENCES,
      theme: "dracula",
    })
    expect(result.success).toBe(false)
  })

  it("accepts the defaults", () => {
    expect(editorPreferencesSchema.safeParse(DEFAULT_EDITOR_PREFERENCES).success).toBe(true)
  })
})
