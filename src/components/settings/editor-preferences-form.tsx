"use client"

import type { ReactNode } from "react"
import { useEditorPreferences } from "@/components/editor-preferences/editor-preferences-provider"
import {
  FONT_SIZE_OPTIONS,
  TAB_SIZE_OPTIONS,
  THEME_OPTIONS,
  type EditorTheme,
} from "@/lib/editor-preferences"
import { cn } from "@/lib/utils"

const selectClassName =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

interface RowProps {
  label: string
  htmlFor?: string
  description?: string
  children: ReactNode
}

function Row({ label, htmlFor, description, children }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

interface ToggleProps {
  id: string
  checked: boolean
  onChange: (next: boolean) => void
}

function Toggle({ id, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

export function EditorPreferencesForm() {
  const { preferences, updatePreferences, saving } = useEditorPreferences()

  return (
    <div className="divide-y divide-border">
      <Row label="Font size" htmlFor="editor-font-size">
        <select
          id="editor-font-size"
          value={preferences.fontSize}
          disabled={saving}
          onChange={(e) => updatePreferences({ fontSize: Number(e.target.value) })}
          className={selectClassName}
        >
          {FONT_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>
      </Row>

      <Row label="Tab size" htmlFor="editor-tab-size">
        <select
          id="editor-tab-size"
          value={preferences.tabSize}
          disabled={saving}
          onChange={(e) => updatePreferences({ tabSize: Number(e.target.value) })}
          className={selectClassName}
        >
          {TAB_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} spaces
            </option>
          ))}
        </select>
      </Row>

      <Row label="Theme" htmlFor="editor-theme">
        <select
          id="editor-theme"
          value={preferences.theme}
          disabled={saving}
          onChange={(e) => updatePreferences({ theme: e.target.value as EditorTheme })}
          className={selectClassName}
        >
          {THEME_OPTIONS.map((theme) => (
            <option key={theme.value} value={theme.value}>
              {theme.label}
            </option>
          ))}
        </select>
      </Row>

      <Row
        label="Word wrap"
        htmlFor="editor-word-wrap"
        description="Wrap long lines instead of scrolling horizontally."
      >
        <Toggle
          id="editor-word-wrap"
          checked={preferences.wordWrap}
          onChange={(next) => updatePreferences({ wordWrap: next })}
        />
      </Row>

      <Row
        label="Minimap"
        htmlFor="editor-minimap"
        description="Show the code overview on the right edge of the editor."
      >
        <Toggle
          id="editor-minimap"
          checked={preferences.minimap}
          onChange={(next) => updatePreferences({ minimap: next })}
        />
      </Row>
    </div>
  )
}
