"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

const MAX_HEIGHT = 400
const MIN_HEIGHT = 120

// The editor chrome is always dark (matching the CodeEditor) regardless of the app theme.
const EDITOR_BG = "#1e1e1e"
const HEADER_BG = "#2d2d2d"

type Tab = "write" | "preview"

interface MarkdownEditorProps {
  value: string
  /** Display (readonly, Preview-only) vs edit (Write + Preview) mode. */
  readOnly?: boolean
  onChange?: (value: string) => void
  id?: string
  ariaLabel?: string
  placeholder?: string
  className?: string
}

export function MarkdownEditor({
  value,
  readOnly = false,
  onChange,
  id,
  ariaLabel,
  placeholder,
  className,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<Tab>(readOnly ? "preview" : "write")
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Readonly mode never leaves Preview, even if state somehow drifts.
  const activeTab: Tab = readOnly ? "preview" : tab

  // Grow the textarea to fit its content, clamped between MIN and MAX; beyond
  // MAX the textarea scrolls. Mirrors the CodeEditor's fluid-height behavior.
  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, el.scrollHeight))}px`
  }, [])

  useEffect(() => {
    if (activeTab === "write") resize()
  }, [activeTab, value, resize])

  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current)
    }
  }, [])

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
      className={cn("overflow-hidden rounded-lg border border-white/10", className)}
      style={{ backgroundColor: EDITOR_BG }}
    >
      {/* Header: tabs on the left, copy on the right */}
      <div
        className="flex items-center justify-between border-b border-white/10 px-2 py-1.5"
        style={{ backgroundColor: HEADER_BG }}
      >
        <div className="flex items-center gap-1" role="tablist">
          {!readOnly && (
            <TabButton active={activeTab === "write"} onClick={() => setTab("write")}>
              Write
            </TabButton>
          )}
          <TabButton active={activeTab === "preview"} onClick={() => setTab("preview")}>
            Preview
          </TabButton>
        </div>
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

      {activeTab === "write" ? (
        <textarea
          ref={textareaRef}
          id={id}
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => {
            onChange?.(e.target.value)
            resize()
          }}
          placeholder={placeholder}
          spellCheck={false}
          className="block w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
          style={{ minHeight: MIN_HEIGHT }}
        />
      ) : (
        <div
          className="markdown-preview overflow-y-auto px-4 py-3"
          style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
        >
          {value.trim() ? (
            <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
          ) : (
            <p className="text-sm text-neutral-600">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded px-2 py-0.5 text-xs transition-colors",
        active
          ? "bg-white/10 text-neutral-100"
          : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
      )}
    >
      {children}
    </button>
  )
}
