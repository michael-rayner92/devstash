"use client"

import type { BeforeMount, OnMount } from "@monaco-editor/react"
import { useState } from "react"
import Editor from "@monaco-editor/react"
import { Check, Copy } from "lucide-react"
import { monacoLanguage } from "@/lib/code-language"
import { EDITOR_CHROME, defineEditorThemes } from "@/lib/monaco-themes"
import { useEditorPreferences } from "@/components/editor-preferences/editor-preferences-provider"
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard"
import { cn } from "@/lib/utils"

const MAX_HEIGHT = 400
const MIN_HEIGHT = 120

// Register the selectable themes and turn off TS/JS validation — this is a snippet
// store, not an IDE, so "cannot find module" squiggles on standalone snippets are
// noise, not signal.
const beforeMount: BeforeMount = (monaco) => {
  const noValidation = { noSemanticValidation: true, noSyntaxValidation: true }
  monaco.languages.typescript?.typescriptDefaults.setDiagnosticsOptions(noValidation)
  monaco.languages.typescript?.javascriptDefaults.setDiagnosticsOptions(noValidation)
  defineEditorThemes(monaco)
}

interface CodeEditorProps {
  value: string
  /** Free-text language label; drives both the header badge and syntax highlighting. */
  language?: string | null
  /** Display (readonly) vs edit mode. */
  readOnly?: boolean
  onChange?: (value: string) => void
  id?: string
  ariaLabel?: string
  className?: string
}

export function CodeEditor({
  value,
  language,
  readOnly = false,
  onChange,
  id,
  ariaLabel,
  className,
}: CodeEditorProps) {
  const [height, setHeight] = useState(MIN_HEIGHT)
  const { copied, copy } = useCopyToClipboard()
  const { preferences } = useEditorPreferences()

  const chrome = EDITOR_CHROME[preferences.theme]
  const label = language?.trim()

  const handleMount: OnMount = (editor) => {
    // Grow the editor to fit its content, clamped between MIN_HEIGHT and MAX_HEIGHT.
    // Beyond MAX_HEIGHT, Monaco's own (themed) scrollbar takes over.
    const updateHeight = () => {
      const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, editor.getContentHeight()))
      setHeight(next)
    }
    updateHeight()
    // Editor disposes its listeners on unmount, so no manual cleanup is needed.
    editor.onDidContentSizeChange(updateHeight)
  }

  return (
    <div
      id={id}
      aria-label={ariaLabel}
      className={cn("overflow-hidden rounded-lg border border-white/10", className)}
      style={{ backgroundColor: chrome.editorBg }}
    >
      {/* macOS-style window header */}
      <div
        className="flex items-center justify-between border-b border-white/10 px-3 py-2"
        style={{ backgroundColor: chrome.headerBg }}
      >
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2">
          {label && (
            <span className="font-mono text-xs lowercase text-neutral-400">{label}</span>
          )}
          <button
            type="button"
            onClick={() => copy(value)}
            disabled={!value}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <Editor
        height={height}
        language={monacoLanguage(language)}
        value={value}
        theme={chrome.monacoTheme}
        beforeMount={beforeMount}
        onMount={handleMount}
        onChange={(next) => onChange?.(next ?? "")}
        loading={<div className="h-full w-full" style={{ backgroundColor: chrome.editorBg }} />}
        options={{
          readOnly,
          domReadOnly: readOnly,
          minimap: { enabled: preferences.minimap },
          fontSize: preferences.fontSize,
          tabSize: preferences.tabSize,
          fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: false,
          wordWrap: preferences.wordWrap ? "on" : "off",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          renderLineHighlight: readOnly ? "none" : "line",
          contextmenu: !readOnly,
          padding: { top: 12, bottom: 12 },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false,
          },
        }}
      />
    </div>
  )
}
