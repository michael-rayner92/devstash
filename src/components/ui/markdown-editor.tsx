"use client"

import type { ReactNode, RefObject } from "react"
import type { OptimizedPrompt } from "@/lib/ai/optimize"
import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import {
  AiEditorButton,
  EDITOR_MAX_HEIGHT,
  EDITOR_MIN_HEIGHT,
  EditorCopyButton,
  EditorTabButton,
  MarkdownPane,
  type AiEditorButtonCopy,
} from "@/components/ui/editor-chrome"
import { cn } from "@/lib/utils"

// The editor chrome is always dark (matching the CodeEditor) regardless of the app theme.
const EDITOR_BG = "#1e1e1e"
const HEADER_BG = "#2d2d2d"

/** Wording for this editor's AI trigger; the button itself is shared chrome. */
const OPTIMIZE_COPY: AiEditorButtonCopy = {
  label: "Optimize",
  pendingLabel: "Optimizing",
  action: "Improve this prompt with AI",
  empty: "Nothing to optimize",
  srName: "Optimize prompt",
  pendingAria: "Optimizing prompt",
}

type Tab = "write" | "preview" | "optimized"

/**
 * Enables the AI "Optimize" control in the header. Passing this is what puts the
 * button there — the create dialog and edit form omit it, which keeps the
 * feature out of those surfaces without the editor having to know which one it
 * is rendering in. Mirrors `CodeEditorExplain`.
 *
 * The editor owns the *view* state (which tab is showing, whether a request is
 * in flight, the returned rewrite); the caller owns both actions, so this stays
 * free of any `@/actions` import.
 */
export interface MarkdownEditorOptimize {
  /**
   * Whether AI features are available to this user. Computed on the server
   * (`getPlanLimits(isPro).ai`) and passed down — `BILLING_ENFORCED` is not
   * exposed to the browser, so the check can't be repeated here. When false the
   * control becomes an inert Pro marker; the server action gates independently.
   */
  canUseAi: boolean
  /** Resolves to the rewrite, or `null` when the call failed (caller has shown the error). */
  onOptimize: () => Promise<OptimizedPrompt | null>
  /** Persists an accepted rewrite. Resolves true on success (caller shows the error otherwise). */
  onAccept: (optimized: string) => Promise<boolean>
}

interface MarkdownEditorProps {
  value: string
  /** Display (readonly, Preview-only) vs edit (Write + Preview) mode. */
  readOnly?: boolean
  onChange?: (value: string) => void
  id?: string
  ariaLabel?: string
  placeholder?: string
  className?: string
  /** Omit to hide the AI optimize control entirely. */
  optimize?: MarkdownEditorOptimize
}

export function MarkdownEditor({
  value,
  readOnly = false,
  onChange,
  id,
  ariaLabel,
  placeholder,
  className,
  optimize,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<Tab>(readOnly ? "preview" : "write")
  const [optimization, setOptimization] = useState<OptimizedPrompt | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [applying, setApplying] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Resolve the requested tab against what actually exists right now: readonly
  // mode has no Write tab, and Optimized only exists while there is a rewrite.
  const activeTab: Tab =
    tab === "optimized" && optimization
      ? "optimized"
      : tab === "write" && !readOnly
        ? "write"
        : "preview"

  // Copy follows the visible tab, so the button always copies what is on screen.
  const copyTarget = activeTab === "optimized" && optimization ? optimization.optimized : value

  async function requestOptimization() {
    if (!optimize) return
    setOptimizing(true)
    const result = await optimize.onOptimize()
    setOptimizing(false)
    if (result) {
      setOptimization(result)
      setTab("optimized")
    }
  }

  async function acceptOptimization() {
    if (!optimize || !optimization) return
    setApplying(true)
    const saved = await optimize.onAccept(optimization.optimized)
    setApplying(false)
    // On failure the original is left on screen with the offer intact, so the
    // user can retry rather than losing the rewrite they just approved.
    if (saved) dismissOptimization()
  }

  function dismissOptimization() {
    setOptimization(null)
    setTab(readOnly ? "preview" : "write")
  }

  // Grow the textarea to fit its content, clamped between the shared min and
  // max; beyond the max the textarea scrolls. Mirrors the CodeEditor.
  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(
      EDITOR_MAX_HEIGHT,
      Math.max(EDITOR_MIN_HEIGHT, el.scrollHeight)
    )}px`
  }, [])

  useEffect(() => {
    if (activeTab === "write") resize()
  }, [activeTab, value, resize])

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-white/10", className)}
      style={{ backgroundColor: EDITOR_BG }}
    >
      {/* Header: tabs on the left, AI + copy on the right */}
      <div
        className="flex items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5"
        style={{ backgroundColor: HEADER_BG }}
      >
        <div className="flex min-w-0 items-center gap-1" role="tablist">
          {!readOnly && (
            <EditorTabButton active={activeTab === "write"} onClick={() => setTab("write")}>
              Write
            </EditorTabButton>
          )}
          <EditorTabButton active={activeTab === "preview"} onClick={() => setTab("preview")}>
            {/* Reads as "Original" once there is a rewrite to compare it against. */}
            {optimization ? "Original" : "Preview"}
          </EditorTabButton>
          {optimization && (
            <EditorTabButton
              active={activeTab === "optimized"}
              onClick={() => setTab("optimized")}
            >
              Optimized
            </EditorTabButton>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Replaced by the Optimized tab once a rewrite exists — dismissing it
              or reopening the drawer brings the button back. */}
          {optimize && !optimization && (
            <AiEditorButton
              canUseAi={optimize.canUseAi}
              pending={optimizing}
              disabled={!value.trim()}
              copy={OPTIMIZE_COPY}
              onClick={requestOptimization}
            />
          )}
          <EditorCopyButton value={copyTarget} />
        </div>
      </div>

      {activeTab === "optimized" && optimization ? (
        <OptimizedPanel
          optimization={optimization}
          applying={applying}
          onAccept={acceptOptimization}
          onDismiss={dismissOptimization}
        />
      ) : activeTab === "write" ? (
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
          style={{ minHeight: EDITOR_MIN_HEIGHT }}
        />
      ) : (
        <MarkdownPane
          value={value}
          empty={<p className="text-sm text-neutral-600">Nothing to preview</p>}
        />
      )}
    </div>
  )
}

/**
 * The rewrite, what changed about it, and the accept/reject choice.
 *
 * When the optimizer judged the prompt already good there is nothing to accept,
 * so the panel says that plainly instead of showing an identical copy of the
 * prompt above a button that would save nothing.
 */
function OptimizedPanel({
  optimization,
  applying,
  onAccept,
  onDismiss,
}: {
  optimization: OptimizedPrompt
  applying: boolean
  onAccept: () => void
  onDismiss: () => void
}) {
  const actionsRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  // Two problems, one fix. The panel is tall enough that its buttons land below
  // the fold of whatever scrolls around it — in the item drawer they render past
  // the end of the scroll container, under the drawer's own footer — so a mouse
  // user can't see the primary action. And the Optimize button that had focus
  // was just unmounted to make room for the tabs, dropping keyboard focus back
  // to the drawer container; moving it here restores the user's place and, since
  // focusing a button announces its label, tells a screen reader what arrived.
  //
  // Focus is deliberate rather than risky: several seconds passed while the
  // request was in flight, so a stray keypress can't carry over into an
  // accidental accept. `preventScroll` leaves the smooth scroll below in charge.
  // Mounted only while the Optimized tab shows, so this fires when it appears.
  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true })
    actionsRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [])

  if (optimization.unchanged) {
    return (
      <div
        ref={actionsRef}
        className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center"
      >
        <Sparkles className="h-5 w-5 text-neutral-500" />
        <div>
          <p className="text-sm text-neutral-200">This prompt already looks good</p>
          <p className="mt-1 text-xs text-neutral-400">
            The optimizer didn&apos;t find anything worth changing.
          </p>
        </div>
        <PanelButton buttonRef={primaryRef} onClick={onDismiss}>
          Back to prompt
        </PanelButton>
      </div>
    )
  }

  return (
    <>
      <div
        className="overflow-y-auto"
        style={{ minHeight: EDITOR_MIN_HEIGHT, maxHeight: EDITOR_MAX_HEIGHT }}
      >
        {/* The pane doesn't scroll itself here — this container scrolls the
            rewrite and its "what changed" list together. */}
        <MarkdownPane value={optimization.optimized} scroll={false} />

        {optimization.changes.length > 0 && (
          <div className="border-t border-white/10 px-4 py-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              What changed
            </h4>
            <ul className="mt-2 space-y-1.5">
              {optimization.changes.map((change) => (
                <li key={change} className="flex gap-2 text-xs leading-relaxed text-neutral-300">
                  <span className="text-neutral-500" aria-hidden>
                    •
                  </span>
                  {change}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div
        ref={actionsRef}
        className="flex items-center justify-end gap-2 border-t border-white/10 px-3 py-2"
      >
        <PanelButton onClick={onDismiss} disabled={applying}>
          Keep original
        </PanelButton>
        <PanelButton primary buttonRef={primaryRef} onClick={onAccept} disabled={applying}>
          {applying ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving
            </>
          ) : (
            "Use this prompt"
          )}
        </PanelButton>
      </div>
    </>
  )
}

/** Buttons inside the always-dark editor chrome, which the app's tokens don't fit. */
function PanelButton({
  primary = false,
  disabled = false,
  buttonRef,
  onClick,
  children,
}: {
  primary?: boolean
  disabled?: boolean
  /** Set on the panel's primary control so it can take focus when the panel appears. */
  buttonRef?: RefObject<HTMLButtonElement | null>
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
        primary
          ? "bg-neutral-100 text-neutral-900 hover:bg-white disabled:hover:bg-neutral-100"
          : "text-neutral-400 hover:bg-white/5 hover:text-neutral-100 disabled:hover:bg-transparent"
      )}
    >
      {children}
    </button>
  )
}
