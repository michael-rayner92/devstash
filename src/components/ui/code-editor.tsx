"use client"

import type { BeforeMount, OnMount } from "@monaco-editor/react"
import type { RefObject } from "react"
import { useEffect, useRef, useState } from "react"
import Editor from "@monaco-editor/react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Check, Copy, Crown, Loader2, Sparkles } from "lucide-react"
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

/**
 * Enables the AI "Explain" control in the header. Passing this is what puts the
 * button there — the create dialog and edit form omit it, which is what keeps
 * the feature out of those surfaces without the editor having to know which one
 * it is rendering in.
 *
 * The editor owns the *view* state (which tab is showing, whether a request is
 * in flight, the returned markdown); the caller owns the action, so this stays
 * free of any `@/actions` import. `onExplain` resolves to the markdown, or to
 * `null` when the call failed — the caller has already shown the error.
 */
export interface CodeEditorExplain {
  /**
   * Whether AI features are available to this user. Computed on the server
   * (`getPlanLimits(isPro).ai`) and passed down — `BILLING_ENFORCED` is not
   * exposed to the browser, so the check can't be repeated here. When false the
   * control becomes an inert Pro marker; the server action gates independently.
   */
  canUseAi: boolean
  onExplain: () => Promise<string | null>
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
  /** Omit to hide the AI explain control entirely. */
  explain?: CodeEditorExplain
}

type Tab = "code" | "explain"

export function CodeEditor({
  value,
  language,
  readOnly = false,
  onChange,
  id,
  ariaLabel,
  className,
  explain,
}: CodeEditorProps) {
  const [height, setHeight] = useState(MIN_HEIGHT)
  const [tab, setTab] = useState<Tab>("code")
  const [explanation, setExplanation] = useState<string | null>(null)
  const [explaining, setExplaining] = useState(false)
  const explainTabRef = useRef<HTMLButtonElement>(null)
  const { copied, copy } = useCopyToClipboard()
  const { preferences } = useEditorPreferences()

  // Requesting an explanation unmounts the Explain button to make room for the
  // tabs, which drops keyboard focus back to whatever contains the editor. Move
  // it to the tab that just appeared, so the user keeps their place and a screen
  // reader hears that the explanation arrived rather than nothing at all.
  useEffect(() => {
    if (explanation) explainTabRef.current?.focus()
  }, [explanation])

  const chrome = EDITOR_CHROME[preferences.theme]
  const label = language?.trim()
  // Tabs only appear once there is something to switch to, so the header stays
  // as it was until the user actually asks for an explanation.
  const activeTab: Tab = explanation ? tab : "code"
  // Copy follows the visible tab: on the Explain tab it takes the markdown, so
  // the button always copies what the user is looking at.
  const copyTarget = activeTab === "explain" && explanation ? explanation : value

  async function requestExplanation() {
    if (!explain) return
    setExplaining(true)
    const result = await explain.onExplain()
    setExplaining(false)
    if (result) {
      setExplanation(result)
      setTab("explain")
    }
  }

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
        className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2"
        style={{ backgroundColor: chrome.headerBg }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          {explanation && (
            <div className="flex items-center gap-1" role="tablist">
              <TabButton active={activeTab === "code"} onClick={() => setTab("code")}>
                Code
              </TabButton>
              <TabButton
                active={activeTab === "explain"}
                buttonRef={explainTabRef}
                onClick={() => setTab("explain")}
              >
                Explain
              </TabButton>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {label && (
            <span className="font-mono text-xs lowercase text-neutral-400">{label}</span>
          )}
          {/* Replaced by the tabs above once an explanation exists — reopening
              the drawer clears it and brings the button back. */}
          {explain && !explanation && (
            <ExplainButton
              canUseAi={explain.canUseAi}
              pending={explaining}
              disabled={!value}
              onClick={requestExplanation}
            />
          )}
          <button
            type="button"
            onClick={() => copy(copyTarget)}
            disabled={!copyTarget}
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

      {activeTab === "explain" && explanation ? (
        <div
          className="markdown-preview overflow-y-auto px-4 py-3"
          style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
        >
          <Markdown remarkPlugins={[remarkGfm]}>{explanation}</Markdown>
        </div>
      ) : (
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
      )}
    </div>
  )
}

const PRO_TOOLTIP = "AI features require Pro subscription"

/**
 * The AI explain trigger. For users without AI access it becomes an inert Crown
 * marker rather than disappearing, so the feature is discoverable as something
 * Pro unlocks.
 *
 * The `title` sits on the wrapper, not the button: a disabled button receives no
 * pointer events, so a tooltip on it never shows.
 */
function ExplainButton({
  canUseAi,
  pending,
  disabled,
  onClick,
}: {
  canUseAi: boolean
  pending: boolean
  disabled: boolean
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
          aria-label={`Explain code. ${PRO_TOOLTIP}`}
          className={cn(buttonClass, "cursor-not-allowed text-neutral-500")}
        >
          <Crown className="h-3.5 w-3.5 text-amber-400/70" />
          Explain
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      title={disabled ? "Nothing to explain" : "Explain this code with AI"}
      aria-label={pending ? "Explaining code" : "Explain this code with AI"}
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
      {pending ? "Explaining" : "Explain"}
    </button>
  )
}

function TabButton({
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
