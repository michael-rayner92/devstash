/**
 * Maps an OpenAI failure to the message the user sees.
 *
 * Pure and duck-typed — no `openai` import — so it is unit testable and safe to
 * reuse from any AI action. `OpenAI.APIError` carries `status`, `code` and
 * `type` (and the raw JSON body on `error`), which is all this needs.
 *
 * The distinction that matters: `insufficient_quota` and `rate_limit_exceeded`
 * are BOTH HTTP 429 but mean opposite things. A quota failure never resolves on
 * its own — telling the user to retry sends them in circles — while a rate
 * limit clears in seconds. Check quota first, since it would otherwise be
 * swallowed by the generic 429 branch.
 */

/** Billing problem on the OpenAI account. Retrying will not help. */
export const AI_QUOTA_MESSAGE =
  "AI features are temporarily unavailable. (The AI service quota has been reached.)"

/** Transient — OpenAI is throttling us. */
export const AI_BUSY_MESSAGE = "The AI service is busy. Please try again in a moment."

export function aiErrorMessage(err: unknown, fallback: string): string {
  const { code, type, status } = readApiError(err)

  if (code === "insufficient_quota" || type === "insufficient_quota") {
    return AI_QUOTA_MESSAGE
  }
  if (code === "rate_limit_exceeded" || status === 429) {
    return AI_BUSY_MESSAGE
  }
  return fallback
}

interface ApiErrorFields {
  code?: string
  type?: string
  status?: number
}

/**
 * Pull the identifying fields off an unknown throw. The SDK sets `code`/`type`
 * on the error itself, but also nests the response body under `error` — some
 * failures only populate the nested copy, so both are read.
 */
function readApiError(err: unknown): ApiErrorFields {
  if (typeof err !== "object" || err === null) return {}
  const outer = err as Record<string, unknown>
  const inner =
    typeof outer.error === "object" && outer.error !== null
      ? (outer.error as Record<string, unknown>)
      : {}

  return {
    code: stringOrUndefined(outer.code ?? inner.code),
    type: stringOrUndefined(outer.type ?? inner.type),
    status: typeof outer.status === "number" ? outer.status : undefined,
  }
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}
