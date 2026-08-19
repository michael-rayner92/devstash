"use client"

import { useState } from "react"
import { Check, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { generateAutoTags } from "@/actions/ai"

interface SuggestTagsProps {
  /**
   * Whether AI features are available to this user. Computed on the server
   * (`getPlanLimits(isPro).ai`) and passed down — `BILLING_ENFORCED` is not
   * exposed to the browser, so the check can't be repeated here. The server
   * action gates independently; this only controls visibility.
   */
  canUseAi: boolean
  title: string
  content: string | null
  /** Tags already on the item, so suggestions never duplicate them. */
  existingTags: string[]
  onAccept: (tag: string) => void
  disabled?: boolean
}

/**
 * "Suggest tags" trigger plus the accept/reject pills for what comes back.
 * Renders nothing for users without AI access.
 */
export function SuggestTags({
  canUseAi,
  title,
  content,
  existingTags,
  onAccept,
  disabled,
}: SuggestTagsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [pending, setPending] = useState(false)

  if (!canUseAi) return null

  // Suggestions are lowercase (see `parseSuggestedTags`); compare in kind so a
  // manually typed "React" still hides a suggested "react".
  const taken = new Set(existingTags.map((tag) => tag.trim().toLowerCase()))
  const visible = suggestions.filter((tag) => !taken.has(tag))
  const hasSomethingToDescribe = title.trim().length > 0 || (content ?? "").trim().length > 0

  async function suggest() {
    setPending(true)
    const result = await generateAutoTags({ title, content })
    setPending(false)

    if (result.success) {
      setSuggestions(result.data.tags)
    } else {
      setSuggestions([])
      toast.error(result.error)
    }
  }

  function accept(tag: string) {
    onAccept(tag)
    setSuggestions((prev) => prev.filter((t) => t !== tag))
  }

  function reject(tag: string) {
    setSuggestions((prev) => prev.filter((t) => t !== tag))
  }

  return (
    <div className="mt-2 space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={suggest}
        disabled={disabled || pending || !hasSomethingToDescribe}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {pending ? "Suggesting…" : "Suggest tags"}
      </Button>

      {visible.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visible.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-border bg-muted/40 py-0.5 pl-2 pr-0.5 text-xs text-muted-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => accept(tag)}
                disabled={disabled}
                aria-label={`Add tag ${tag}`}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-emerald-400 disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => reject(tag)}
                disabled={disabled}
                aria-label={`Dismiss tag ${tag}`}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
