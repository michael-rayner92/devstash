"use server"

import { z } from "zod"
import { firstIssueMessage, requireSession } from "@/lib/action-helpers"
import { AI_MODEL, aiConfigured, getOpenAI } from "@/lib/ai/client"
import { aiErrorMessage } from "@/lib/ai/errors"
import {
  DESCRIPTION_INSTRUCTIONS,
  buildDescriptionInput,
  hasDescribableInput,
  parseDescription,
} from "@/lib/ai/description"
import type { DescriptionSource } from "@/lib/ai/description"
import {
  EXPLAIN_INSTRUCTIONS,
  buildExplainInput,
  hasExplainableInput,
  parseExplanation,
} from "@/lib/ai/explain"
import {
  OPTIMIZE_INSTRUCTIONS,
  buildOptimizeInput,
  hasOptimizableInput,
  parseOptimizedPrompt,
} from "@/lib/ai/optimize"
import type { OptimizedPrompt } from "@/lib/ai/optimize"
import { TAG_INSTRUCTIONS, buildTagInput, parseSuggestedTags } from "@/lib/ai/tags"
import { getIsPro } from "@/lib/db/billing"
import { getItemForExplain, getItemForOptimize } from "@/lib/db/items"
import { isCodeType, isPromptType } from "@/lib/item-fields"
import { checkRateLimit, retryAfterMinutes } from "@/lib/rate-limit"
import { aiNotAllowedError } from "@/lib/usage-limits"

/**
 * An optional text field arriving from a form. Blank and whitespace-only both
 * mean "absent", so they collapse to null — which is what the `refine`s below
 * check to decide whether there is anything to send the model at all.
 */
const nullableText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().nullable()
)

/**
 * The gates every AI action shares, in the order they must run: configuration,
 * then the Pro check, then the spend cap.
 *
 * Extracted so a new AI feature cannot ship having forgotten one — the rate
 * limit in particular is the only thing bounding OpenAI spend. Auth and input
 * validation stay in each action: they run *before* this, so an unauthenticated
 * or malformed request never consumes a rate-limit token.
 */
async function aiGate(userId: string): Promise<{ error: string } | null> {
  if (!aiConfigured()) {
    return { error: "AI features are not configured." }
  }

  // Pro gate. Read from the DB rather than the session's `isPro` so a webhook
  // that just downgraded a user takes effect without waiting for a token
  // refresh. Routed through `getPlanLimits`, so it respects BILLING_ENFORCED
  // like every other Pro gate in the app.
  const isPro = await getIsPro(userId)
  if (isPro === null) {
    return { error: "Account not found" }
  }
  const gateError = aiNotAllowedError(isPro)
  if (gateError) {
    return { error: gateError }
  }

  // Always on, independent of BILLING_ENFORCED — this is the cap that bounds
  // spend. Note it fails OPEN when Upstash is unset *or unreachable*, so a dead
  // Redis silently removes the cap rather than blocking users.
  const limit = await checkRateLimit("ai", `ai:${userId}`)
  if (!limit.success) {
    const minutes = retryAfterMinutes(limit.reset)
    return {
      error: `You've used all your AI requests for now. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
    }
  }

  return null
}

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
 * endpoint from being a free OpenAI proxy is therefore the layered gating —
 * auth here, then `aiGate` — plus the server-side truncation in `buildTagInput`,
 * which caps BOTH fields so the cost of a single call is bounded no matter how
 * much the client sends.
 */
const generateAutoTagsSchema = z
  .object({
    title: z.string().trim(),
    content: nullableText,
  })
  .refine((data) => data.title.length > 0 || data.content !== null, {
    message: "Add a title or some content first",
    path: ["title"],
  })

export async function generateAutoTags(
  input: GenerateAutoTagsInput
): Promise<GenerateAutoTagsResult> {
  const session = await requireSession()
  if (!session) {
    return { success: false, error: "Not authenticated" }
  }
  const userId = session.user.id

  const parsed = generateAutoTagsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) }
  }

  const gate = await aiGate(userId)
  if (gate) {
    return { success: false, error: gate.error }
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

export type GenerateDescriptionInput = DescriptionSource

export type GenerateDescriptionResult =
  | { success: true; data: { description: string } }
  | { success: false; error: string }

/**
 * Every field comes from the form rather than the DB, and deliberately so: the
 * create dialog has no item row yet, and in edit mode the user wants a
 * description of what they are currently typing, not of the last saved version.
 * Nothing here is persisted — the caller writes the result into the description
 * input, and the existing Create/Save path does the writing.
 *
 * What keeps this from being a free OpenAI proxy is `aiGate` plus the
 * server-side truncation in `buildDescriptionInput`, which clips every field so
 * one call's cost is bounded no matter how much the client sends.
 */
const generateDescriptionSchema = z
  .object({
    typeName: z.string().trim(),
    title: z.string().trim(),
    content: nullableText,
    language: nullableText,
    url: nullableText,
    fileName: nullableText,
  })
  // Same helper the button's disabled state uses, so the UI and the server
  // agree on what counts as "nothing to describe".
  .refine(hasDescribableInput, {
    message: "Add a title or some content first",
    path: ["title"],
  })

export async function generateDescription(
  input: GenerateDescriptionInput
): Promise<GenerateDescriptionResult> {
  const session = await requireSession()
  if (!session) {
    return { success: false, error: "Not authenticated" }
  }
  const userId = session.user.id

  const parsed = generateDescriptionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) }
  }

  const gate = await aiGate(userId)
  if (gate) {
    return { success: false, error: gate.error }
  }

  try {
    // Responses API and `store: false` for the same reasons as tag suggestion;
    // plain text output rather than `json_object`, since one or two sentences
    // need no structure. `effort: "minimal"` is the floor for gpt-5-nano
    // (`none` is rejected) and is a large win on both latency and cost.
    const response = await getOpenAI().responses.create({
      model: AI_MODEL,
      instructions: DESCRIPTION_INSTRUCTIONS,
      input: buildDescriptionInput(parsed.data),
      reasoning: { effort: "minimal" },
      store: false,
    })

    const description = parseDescription(response.output_text)
    if (!description) {
      return {
        success: false,
        error: "Couldn't write a description for this. Try adding more detail.",
      }
    }
    return { success: true, data: { description } }
  } catch (err) {
    // Kept at error level with the full object: the message the user gets is
    // deliberately vague, so the log is the only place the real cause survives.
    console.error("AI description generation failed", err)
    return {
      success: false,
      error: aiErrorMessage(
        err,
        "AI descriptions are unavailable right now. Please try again."
      ),
    }
  }
}

export interface ExplainCodeInput {
  itemId: string
}

export type ExplainCodeResult =
  | { success: true; data: { explanation: string } }
  | { success: false; error: string }

/**
 * Reasoning tokens are billed and counted as output tokens, so this cap has to
 * cover both the thinking and the ~300-word answer. Set well above what a
 * well-behaved call needs: hitting it truncates the explanation rather than
 * failing, but a cliff-edge cut is still worth avoiding.
 */
const EXPLAIN_MAX_OUTPUT_TOKENS = 2000

const explainCodeSchema = z.object({
  itemId: z.string().trim().min(1, "Missing item"),
})

/**
 * Explain a saved snippet or command. Unlike the other two AI actions, the
 * content is read from the DB by id rather than accepted from the client — this
 * one only ever runs against an item that already exists (the drawer's read
 * view), so there is no reason to trust a client-supplied body, and reading it
 * server-side means the endpoint can only explain content its caller owns.
 *
 * Nothing is persisted: the explanation lives in component state for the life of
 * the drawer and is regenerated on the next click.
 */
export async function explainCode(input: ExplainCodeInput): Promise<ExplainCodeResult> {
  const session = await requireSession()
  if (!session) {
    return { success: false, error: "Not authenticated" }
  }
  const userId = session.user.id

  const parsed = explainCodeSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) }
  }

  // Loaded before `aiGate` on purpose. A missing, unowned or unexplainable item
  // is a malformed request in the same sense a blank title is, and those are
  // rejected ahead of the gate so they never consume a rate-limit token. The
  // owner-scoped query means an id belonging to someone else is indistinguishable
  // from one that doesn't exist. The `hasExplainableInput` check catches a body
  // of pure whitespace, which is truthy in the DB but nothing to explain.
  const item = await getItemForExplain(userId, parsed.data.itemId)
  if (!item || !hasExplainableInput(item)) {
    return { success: false, error: "Couldn't find this item's content to explain." }
  }
  // Enforced server-side rather than trusting the UI, which only renders the
  // button for code types: without this, the action would happily spend a call
  // explaining an 8,000-character note.
  if (!isCodeType(item.typeName)) {
    return { success: false, error: "Only snippets and commands can be explained." }
  }

  const gate = await aiGate(userId)
  if (gate) {
    return { success: false, error: gate.error }
  }

  try {
    // Responses API and `store: false` for the same reasons as the other two
    // actions; plain text out, since the reply is markdown. Effort is `low`
    // rather than the `minimal` the others use — this is the one feature that
    // benefits from the model actually working through the code, and the extra
    // latency lands on an explicit button press with a spinner rather than in
    // the middle of typing.
    const response = await getOpenAI().responses.create({
      model: AI_MODEL,
      instructions: EXPLAIN_INSTRUCTIONS,
      input: buildExplainInput(item),
      reasoning: { effort: "low" },
      max_output_tokens: EXPLAIN_MAX_OUTPUT_TOKENS,
      store: false,
    })

    const explanation = parseExplanation(response.output_text)
    if (!explanation) {
      return {
        success: false,
        error: "Couldn't explain this one. Please try again.",
      }
    }
    return { success: true, data: { explanation } }
  } catch (err) {
    // Kept at error level with the full object: the message the user gets is
    // deliberately vague, so the log is the only place the real cause survives.
    console.error("AI code explanation failed", err)
    return {
      success: false,
      error: aiErrorMessage(
        err,
        "AI explanations are unavailable right now. Please try again."
      ),
    }
  }
}

export interface OptimizePromptInput {
  itemId: string
}

export type OptimizePromptResult =
  | { success: true; data: OptimizedPrompt }
  | { success: false; error: string }

/**
 * Covers the reasoning tokens and the rewrite, which is the longest output of
 * the four features — it reproduces the whole prompt rather than summarising it.
 * Set well above what a 6,000-character input needs, since running out mid-JSON
 * fails the parse rather than truncating gracefully.
 */
const OPTIMIZE_MAX_OUTPUT_TOKENS = 3000

const optimizePromptSchema = z.object({
  itemId: z.string().trim().min(1, "Missing item"),
})

/**
 * Rewrite a saved prompt so it produces better results, and report what changed.
 *
 * Like `explainCode`, the content is read from the DB by id rather than accepted
 * from the client — this only runs against an item that already exists, so the
 * request body is one id and the owner-scoped query means the action can only
 * ever read content its caller owns. (docs/ai-integration-plan.md §6.4 floats
 * accepting a client-supplied draft so the create dialog could optimize before
 * saving; not taken — the button lives only in the drawer's read view.)
 *
 * Nothing is persisted here. The caller shows the rewrite for approval and, if
 * accepted, saves it through the ordinary `updateItem` path.
 */
export async function optimizePrompt(
  input: OptimizePromptInput
): Promise<OptimizePromptResult> {
  const session = await requireSession()
  if (!session) {
    return { success: false, error: "Not authenticated" }
  }
  const userId = session.user.id

  const parsed = optimizePromptSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) }
  }

  // Loaded before `aiGate`, matching `explainCode`: a missing, unowned or empty
  // item is a malformed request, and those are rejected ahead of the gate so
  // they never consume a rate-limit token. The owner-scoped query makes an id
  // belonging to someone else indistinguishable from one that doesn't exist,
  // and `hasOptimizableInput` catches a whitespace-only body — truthy in the DB,
  // but nothing to rewrite.
  const item = await getItemForOptimize(userId, parsed.data.itemId)
  if (!item || !hasOptimizableInput(item)) {
    return { success: false, error: "Couldn't find this prompt's content to optimize." }
  }
  // Enforced server-side rather than trusting the UI, which only renders the
  // button on prompt items. Note `isMarkdownType` would be the wrong gate here:
  // it also matches notes, which share the markdown editor but aren't prompts.
  if (!isPromptType(item.typeName)) {
    return { success: false, error: "Only prompts can be optimized." }
  }

  const gate = await aiGate(userId)
  if (gate) {
    return { success: false, error: gate.error }
  }

  try {
    // Responses API and `store: false` for the same reasons as the other three
    // actions. `json_object` rather than plain text because the accept/reject UI
    // needs the rewrite and the rationale as separate fields — and note
    // `buildOptimizeInput` must therefore mention "json" in the input itself.
    // Effort is `low` rather than `minimal`: judging whether a prompt is already
    // good, and rewriting it if not, is the kind of work that benefits, and the
    // latency lands on an explicit button press with a spinner.
    const response = await getOpenAI().responses.create({
      model: AI_MODEL,
      instructions: OPTIMIZE_INSTRUCTIONS,
      input: buildOptimizeInput(item),
      text: { format: { type: "json_object" } },
      reasoning: { effort: "low" },
      max_output_tokens: OPTIMIZE_MAX_OUTPUT_TOKENS,
      store: false,
    })

    const optimization = parseOptimizedPrompt(response.output_text, item.content)
    if (!optimization) {
      return {
        success: false,
        error: "Couldn't optimize this prompt. Please try again.",
      }
    }
    return { success: true, data: optimization }
  } catch (err) {
    // Kept at error level with the full object: the message the user gets is
    // deliberately vague, so the log is the only place the real cause survives.
    console.error("AI prompt optimization failed", err)
    return {
      success: false,
      error: aiErrorMessage(
        err,
        "AI prompt optimization is unavailable right now. Please try again."
      ),
    }
  }
}
