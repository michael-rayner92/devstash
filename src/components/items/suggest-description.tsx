"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { generateDescription } from "@/actions/ai"
import { hasDescribableInput } from "@/lib/ai/description"
import type { DescriptionSource } from "@/lib/ai/description"

interface SuggestDescriptionProps {
  /**
   * Whether AI features are available to this user. Computed on the server
   * (`getPlanLimits(isPro).ai`) and passed down — `BILLING_ENFORCED` is not
   * exposed to the browser, so the check can't be repeated here. The server
   * action gates independently; this only controls visibility.
   */
  canUseAi: boolean
  source: DescriptionSource
  onGenerated: (description: string) => void
  disabled?: boolean
}

/**
 * Icon button that writes an AI-generated description into the description
 * field. Renders nothing for users without AI access.
 *
 * The result replaces whatever is in the field. That is destructive of typed
 * text, but the field is client state until Create/Save, so Cancel still
 * discards it — and a "generate" control that appends would produce nonsense.
 */
export function SuggestDescription({
  canUseAi,
  source,
  onGenerated,
  disabled,
}: SuggestDescriptionProps) {
  const [pending, setPending] = useState(false)

  if (!canUseAi) return null

  const nothingToDescribe = !hasDescribableInput(source)

  async function generate() {
    setPending(true)
    const result = await generateDescription(source)
    setPending(false)

    if (result.success) {
      onGenerated(result.data.description)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={generate}
      disabled={disabled || pending || nothingToDescribe}
      aria-label={pending ? "Generating description" : "Generate description with AI"}
      title={
        nothingToDescribe
          ? "Add a title or some content first"
          : "Generate description with AI"
      }
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
    </Button>
  )
}
