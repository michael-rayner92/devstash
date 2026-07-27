"use client"

import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useState } from "react"
import { toast } from "sonner"
import { updateEditorPreferences } from "@/actions/editor-preferences"
import {
  DEFAULT_EDITOR_PREFERENCES,
  type EditorPreferences,
} from "@/lib/editor-preferences"

interface EditorPreferencesContextValue {
  preferences: EditorPreferences
  /** Merge a partial update, persist it (auto-save), and toast the result. */
  updatePreferences: (partial: Partial<EditorPreferences>) => void
  /** True while a save is in flight. */
  saving: boolean
}

const EditorPreferencesContext = createContext<EditorPreferencesContextValue | null>(null)

interface EditorPreferencesProviderProps {
  initialPreferences: EditorPreferences
  children: ReactNode
}

export function EditorPreferencesProvider({
  initialPreferences,
  children,
}: EditorPreferencesProviderProps) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [saving, setSaving] = useState(false)

  const updatePreferences = useCallback(
    (partial: Partial<EditorPreferences>) => {
      const previous = preferences
      const next = { ...preferences, ...partial }

      // Optimistically apply, then persist. On failure, roll back.
      setPreferences(next)
      setSaving(true)
      updateEditorPreferences(next)
        .then((result) => {
          if (result.success) {
            // Adopt the server's normalized value as the source of truth.
            setPreferences(result.data)
            toast.success("Editor preferences saved")
          } else {
            setPreferences(previous)
            toast.error(result.error)
          }
        })
        .catch(() => {
          setPreferences(previous)
          toast.error("Something went wrong. Please try again.")
        })
        .finally(() => setSaving(false))
    },
    [preferences]
  )

  return (
    <EditorPreferencesContext.Provider value={{ preferences, updatePreferences, saving }}>
      {children}
    </EditorPreferencesContext.Provider>
  )
}

/**
 * Access editor preferences. Outside a provider (e.g. a standalone `CodeEditor`
 * or a unit test) this returns the defaults with a no-op updater, so consumers
 * always get a usable value.
 */
export function useEditorPreferences(): EditorPreferencesContextValue {
  const ctx = useContext(EditorPreferencesContext)
  if (ctx) return ctx
  return {
    preferences: DEFAULT_EDITOR_PREFERENCES,
    updatePreferences: () => {},
    saving: false,
  }
}
