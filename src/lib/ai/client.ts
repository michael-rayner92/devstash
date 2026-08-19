import OpenAI from "openai"

/**
 * OpenAI access for the Pro-only AI features.
 *
 * Mirrors `src/lib/stripe.ts` / `src/lib/r2.ts`: the client is created lazily
 * and memoized, so importing this module never throws when `OPENAI_API_KEY` is
 * absent (e.g. during `next build`). Only `getOpenAI()` throws, and only when
 * actually used — callers should check `aiConfigured()` first and return a
 * user-facing message instead.
 *
 * SERVER ONLY. Never import this from a client component.
 */

/**
 * The one place the model id lives, so swapping it is a one-line change.
 *
 * NOTE: `gpt-5-nano` returns an empty string through the Chat Completions API.
 * Every call site must use the Responses API (`client.responses.create`) and
 * read `response.output_text`. See docs/ai-integration-plan.md §2.
 */
export const AI_MODEL = "gpt-5-nano"

let client: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (client) return client

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OpenAI is not configured (missing OPENAI_API_KEY).")
  }

  // Default maxRetries is 2 (retries 408/409/429/5xx and connection errors).
  // Kept, with an explicit timeout so a hung call can't hold a request open.
  client = new OpenAI({ apiKey, maxRetries: 2, timeout: 30_000 })
  return client
}

/** Whether AI features are usable at all in this deployment. */
export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}
