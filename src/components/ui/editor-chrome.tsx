"use client"

import type { ReactNode, RefObject } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Check, Copy, Crown, Loader2, Sparkles } from "lucide-react"
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard"
import { cn } from "@/lib/utils"

/**
 * Chrome shared by the two content editors — `CodeEditor` (Monaco) and
 * `MarkdownEditor`. Both are always-dark regardless of the app theme, so these
 * pieces are styled with fixed neutral classes rather than the app's tokens.
 *
 * Each editor had its own copy of every part below; the AI trigger in
 * particular was duplicated down to the `title`-on-the-wrapper trick, differing
 * only in its wording, which is now passed in as `AiEditorButtonCopy`.
 */

/** Fluid editor height bounds: grow to fit content, scroll past the max. */
export const EDITOR_MIN_HEIGHT = 120
export const EDITOR_MAX_HEIGHT = 400

/** A tab in an editor header (Code/Explain, Write/Preview/Optimized). */
export function EditorTabButton({
  active,
  buttonRef,
  onClick,
  children,
}: {
  active: boolean
  /** Set on a tab that should take focus when it appears. */
  buttonRef?: RefObject<HTMLButtonElement | null>
  onClick: () => void
  children: string
}) {
  return (
    <button
      ref={buttonRef}
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

/**
 * Copy button for an editor header. Owns its own transient "Copied" state, so
 * callers only pass what should be copied — which is the text of whichever tab
 * is visible, not necessarily the editor's value.
 */
export function EditorCopyButton({ value }: { value: string }) {
  const { copied, copy } = useCopyToClipboard()

  return (
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
  )
}

const PRO_TOOLTIP = "AI features require Pro subscription"

/** Wording for one AI trigger. Every string the button can show or announce. */
export interface AiEditorButtonCopy {
  /** Idle label, e.g. "Explain". */
  label: string
  /** Label while a request is in flight, e.g. "Explaining". */
  pendingLabel: string
  /** What the control does — the title and aria-label, e.g. "Explain this code with AI". */
  action: string
  /** Title when there is nothing to act on, e.g. "Nothing to explain". */
  empty: string
  /** Names the target for a screen reader on the Pro variant, e.g. "Explain code". */
  srName: string
  /** aria-label while pending, e.g. "Explaining code". */
  pendingAria: string
}

/**
 * An AI trigger in an editor header. For users without AI access it becomes an
 * inert Crown marker rather than disappearing, so the feature is discoverable
 * as something Pro unlocks.
 *
 * The `title` sits on the wrapper, not the button: a disabled button receives no
 * pointer events, so a tooltip on it never shows.
 */
export function AiEditorButton({
  canUseAi,
  pending,
  disabled,
  copy,
  onClick,
}: {
  canUseAi: boolean
  pending: boolean
  disabled: boolean
  copy: AiEditorButtonCopy
  onClick: () => void
}) {
  const buttonClass =
    "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors disabled:hover:bg-transparent"

  if (!canUseAi) {
    return (
      <span title={PRO_TOOLTIP}>
        <button
          type="button"
          disabled
          aria-label={`${copy.srName}. ${PRO_TOOLTIP}`}
          className={cn(buttonClass, "cursor-not-allowed text-neutral-500")}
        >
          <Crown className="h-3.5 w-3.5 text-amber-400/70" />
          {copy.label}
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      title={disabled ? copy.empty : copy.action}
      aria-label={pending ? copy.pendingAria : copy.action}
      className={cn(
        buttonClass,
        "text-neutral-400 hover:bg-white/5 hover:text-neutral-100 disabled:opacity-40"
      )}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {pending ? copy.pendingLabel : copy.label}
    </button>
  )
}

/**
 * Rendered markdown inside the editor chrome, styled by the `.markdown-preview`
 * block in `globals.css`.
 *
 * `scroll` owns the height clamp; pass false where an ancestor is already the
 * scroll container (the optimized-prompt panel scrolls the rewrite and its
 * "what changed" list together).
 */
export function MarkdownPane({
  value,
  scroll = true,
  empty,
  className,
}: {
  value: string
  scroll?: boolean
  /** Shown instead of the markdown when `value` is blank. */
  empty?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("markdown-preview px-4 py-3", scroll && "overflow-y-auto", className)}
      style={
        scroll
          ? { minHeight: EDITOR_MIN_HEIGHT, maxHeight: EDITOR_MAX_HEIGHT }
          : undefined
      }
    >
      {value.trim() || !empty ? <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown> : empty}
    </div>
  )
}
