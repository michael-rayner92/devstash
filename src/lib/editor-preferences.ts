import { z } from "zod"

/**
 * User-configurable Monaco editor preferences, persisted as a JSON column on the
 * User model and applied to every `CodeEditor` instance via `EditorPreferencesProvider`.
 */
export interface EditorPreferences {
  fontSize: number
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  theme: EditorTheme
}

export type EditorTheme = "vs-dark" | "monokai" | "github-dark"

/** Selectable option lists — also drive the settings dropdowns. */
export const FONT_SIZE_OPTIONS = [12, 13, 14, 16, 18] as const
export const TAB_SIZE_OPTIONS = [2, 4, 8] as const
export const THEME_OPTIONS: { value: EditorTheme; label: string }[] = [
  { value: "vs-dark", label: "VS Dark" },
  { value: "monokai", label: "Monokai" },
  { value: "github-dark", label: "GitHub Dark" },
]

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
  theme: "vs-dark",
}

const THEME_VALUES = THEME_OPTIONS.map((t) => t.value) as [EditorTheme, ...EditorTheme[]]

/** Zod schema — the source of truth for validating incoming preference updates. */
export const editorPreferencesSchema = z.object({
  fontSize: z.number().int().refine((n) => (FONT_SIZE_OPTIONS as readonly number[]).includes(n), {
    message: "Invalid font size",
  }),
  tabSize: z.number().int().refine((n) => (TAB_SIZE_OPTIONS as readonly number[]).includes(n), {
    message: "Invalid tab size",
  }),
  wordWrap: z.boolean(),
  minimap: z.boolean(),
  theme: z.enum(THEME_VALUES),
})

/**
 * Coerce arbitrary stored JSON (or a partial object) into a complete, valid
 * `EditorPreferences`, falling back to the default for any missing/invalid field.
 * Used when reading the User.editorPreferences column, which is untyped JSON and
 * may be null, stale, or partially populated.
 */
export function normalizeEditorPreferences(raw: unknown): EditorPreferences {
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_EDITOR_PREFERENCES }
  }

  const source = raw as Record<string, unknown>
  const pick = <K extends keyof EditorPreferences>(key: K): EditorPreferences[K] => {
    const candidate = { ...DEFAULT_EDITOR_PREFERENCES, [key]: source[key] }
    const parsed = editorPreferencesSchema.safeParse(candidate)
    return parsed.success ? (source[key] as EditorPreferences[K]) : DEFAULT_EDITOR_PREFERENCES[key]
  }

  return {
    fontSize: pick("fontSize"),
    tabSize: pick("tabSize"),
    wordWrap: pick("wordWrap"),
    minimap: pick("minimap"),
    theme: pick("theme"),
  }
}
