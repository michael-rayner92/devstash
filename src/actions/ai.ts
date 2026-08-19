"use server"

import { z } from "zod"
import { auth } from "@/auth"
import { AI_MODEL, aiConfigured, getOpenAI } from "@/lib/ai/client"
import { aiErrorMessage } from "@/lib/ai/errors"
import { TAG_INSTRUCTIONS, buildTagInput, parseSuggestedTags } from "@/lib/ai/tags"
import { getIsPro } from "@/lib/db/billing"
import { checkRateLimit, retryAfterMinutes } from "@/lib/rate-limit"
import { aiNotAllowedError } from "@/lib/usage-limits"

export interface GenerateAutoTagsInput {
  title: string
  content: string | null
}

export type GenerateAutoTagsResult =
  | { success: true; data: { tags: string[] } }
  | { success: false; error: string }

/**
 * Title and content come from the form rather than the DB on purpose: the
 * create dialog has no item row yet, and in edit mode the user expects tags for
 * what they are currently typing, not the last saved version. What keeps the
 * endpoint from being a free OpenAI proxy is therefore the layered gating
 * below — auth, the Pro check, a per-user hourly cap — plus the server-side
 * truncation in `buildTagInput`, which caps BOTH fields so the cost of a single
 * call is bounded no matter how much the client sends.
 */
const generateAutoTagsSchema = z
  .object({
    title: z.string().trim(),
    content: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.string().nullable()
    ),
  })
  .refine((data) => data.title.length > 0 || data.content !== null, {
    message: "Add a title or some content first",
    path: ["title"],
  })

export async function generateAutoTags(
  input: GenerateAutoTagsInput
): Promise<GenerateAutoTagsResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }
  const userId = session.user.id

  const parsed = generateAutoTagsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  if (!aiConfigured()) {
    return { success: false, error: "AI features are not configured." }
  }

  // Pro gate. Read from the DB rather than the session's `isPro` so a webhook
  // that just downgraded a user takes effect without waiting for a token
  // refresh. Routed through `getPlanLimits`, so it respects BILLING_ENFORCED
  // like every other Pro gate in the app.
  const isPro = await getIsPro(userId)
  if (isPro === null) {
    return { success: false, error: "Account not found" }
  }
  const gateError = aiNotAllowedError(isPro)
  if (gateError) {
    return { success: false, error: gateError }
  }

  // Always on, independent of BILLING_ENFORCED — this is the cap that bounds
  // spend. Note it fails OPEN when Upstash is unset *or unreachable*, so a dead
  // Redis silently removes the cap rather than blocking users.
  const limit = await checkRateLimit("ai", `ai:${userId}`)
  if (!limit.success) {
    const minutes = retryAfterMinutes(limit.reset)
    return {
      success: false,
      error: `You've used all your AI requests for now. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
    }
  }

  try {
    // Responses API, not Chat Completions: gpt-5-nano returns an empty string
    // through Chat Completions. `store: false` opts out of OpenAI's 30-day
    // retention of request and response bodies — this is the user's own
    // stashed content.
    const response = await getOpenAI().responses.create({
      model: AI_MODEL,
      instructions: TAG_INSTRUCTIONS,
      input: buildTagInput(parsed.data),
      text: { format: { type: "json_object" } },
      // Tagging needs no deliberation, and the default effort is expensive on
      // both axes: measured against this exact prompt, the default spent
      // ~550 reasoning tokens and took 4.6-5.4s, while `minimal` spent zero and
      // took 0.8-1.1s for the same tags. Note `none` is rejected by gpt-5-nano
      // (`unsupported_value`) — `minimal` is the floor for this model.
      reasoning: { effort: "minimal" },
      store: false,
    })

    const tags = parseSuggestedTags(response.output_text)
    if (tags.length === 0) {
      return {
        success: false,
        error: "Couldn't suggest any tags for this. Try adding more detail.",
      }
    }
    return { success: true, data: { tags } }
  } catch (err) {
    // Kept at error level with the full object: the message the user gets is
    // deliberately vague, so the log is the only place the real cause survives.
    console.error("AI tag suggestion failed", err)
    return {
      success: false,
      error: aiErrorMessage(
        err,
        "AI tag suggestions are unavailable right now. Please try again."
      ),
    }
  }
}
