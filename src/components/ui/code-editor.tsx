"use client"

import type { BeforeMount, OnMount } from "@monaco-editor/react"
import { useRef, useState } from "react"
import Editor from "@monaco-editor/react"
import { Check, Copy } from "lucide-react"
import { monacoLanguage } from "@/lib/code-language"
import { cn } from "@/lib/utils"

const MAX_HEIGHT = 400
const MIN_HEIGHT = 120
const THEME_NAME = "devstash-dark"

// The editor chrome is always dark (VS Code style) regardless of the app theme.
const EDITOR_BG = "#1a1a1a"
const HEADER_BG = "#212121"

// Define a dark theme with a slim, translucent scrollbar that matches the app border tone,
// and turn off TS/JS validation — this is a snippet store, not an IDE, so "cannot find module"
// squiggles on standalone snippets are noise, not signal.
const beforeMount: BeforeMount = (monaco) => {
  const noValidation = { noSemanticValidation: true, noSyntaxValidation: true }
  monaco.languages.typescript?.typescriptDefaults.setDiagnosticsOptions(noValidation)
  monaco.languages.typescript?.javascriptDefaults.setDiagnosticsOptions(noValidation)

  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": EDITOR_BG,
      "editor.foreground": "#e5e5e5",
      "editorGutter.background": EDITOR_BG,
      "editorLineNumber.foreground": "#4d4d4d",
      "editorLineNumber.activeForeground": "#a3a3a3",
      "editorCursor.foreground": "#e5e5e5",
      "editor.selectionBackground": "#264f7855",
      "editor.lineHighlightBackground": "#ffffff08",
      "editorWidget.background": "#1f1f1f",
      "editorWidget.border": "#ffffff1a",
      "scrollbarSlider.background": "#ffffff1a",
      "scrollbarSlider.hoverBackground": "#ffffff33",
      "scrollbarSlider.activeBackground": "#ffffff4d",
    },
  })
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
  const [copied, setCopied] = useState(false)
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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

  async function handleCopy() {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (copyTimeout.current) clearTimeout(copyTimeout.current)
      copyTimeout.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be unavailable (e.g. insecure context) — fail silently.
    }
  }

  return (
    <div
      id={id}
      aria-label={ariaLabel}
      className={cn("overflow-hidden rounded-lg border border-white/10", className)}
      style={{ backgroundColor: EDITOR_BG }}
    >
      {/* macOS-style window header */}
      <div
        className="flex items-center justify-between border-b border-white/10 px-3 py-2"
        style={{ backgroundColor: HEADER_BG }}
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
            onClick={handleCopy}
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
        theme={THEME_NAME}
        beforeMount={beforeMount}
        onMount={handleMount}
        onChange={(next) => onChange?.(next ?? "")}
        loading={<div className="h-full w-full" style={{ backgroundColor: EDITOR_BG }} />}
        options={{
          readOnly,
          domReadOnly: readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: false,
          wordWrap: "on",
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
