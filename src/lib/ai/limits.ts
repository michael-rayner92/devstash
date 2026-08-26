/**
 * Caps on what any AI feature sends to the model.
 *
 * These live in their own module because more than one feature needs them
 * (tag suggestions and description generation both read an item's title and
 * content), and because they are the thing that bounds the cost of a single
 * call. A server action's gates decide *whether* a call happens; these decide
 * how expensive it can be when it does.
 *
 * Nothing stops a crafted request from sending one megabyte in any of these
 * fields (Next's server-action body limit is the only other bound), so every
 * field fed to a prompt must pass through `clip`.
 */

/** Titles are a single-line `Input`; a real one never approaches this. */
export const MAX_AI_TITLE_CHARS = 200

/** The item body — the only field where the cap is routinely hit. */
export const MAX_AI_CONTENT_CHARS = 2000

/**
 * The item body when the body itself is the subject — code explanation.
 *
 * Deliberately larger than `MAX_AI_CONTENT_CHARS`. Tagging and description can
 * work from the first part of a file: a tag drawn from the opening 2,000 chars
 * is usually the same tag. An explanation cannot — clipping the code produces an
 * explanation of different code, which is wrong rather than merely vaguer. The
 * cost of the extra input is negligible on `gpt-5-nano` (~$0.0001 per call), and
 * `buildExplainInput` tells the model when the code *was* clipped so it doesn't
 * describe an ending it never saw.
 */
export const MAX_AI_CODE_CHARS = 8000

/**
 * The item body when the body is a prompt being rewritten — the optimizer.
 *
 * Between the tagging and explanation caps, per docs/ai-integration-plan.md §11.
 * Like explanation this reads the whole body rather than a sample, since the
 * output is a rewrite of it and clipping would silently drop instructions the
 * user wrote. Smaller than the code cap because a saved prompt is prose: 6,000
 * characters is roughly 900 words, well past any prompt in practice.
 */
export const MAX_AI_PROMPT_CHARS = 6000

/** Long enough for any real URL, short enough to bound a fabricated one. */
export const MAX_AI_URL_CHARS = 500

/** File names are already length-limited by every OS this runs on. */
export const MAX_AI_FILE_NAME_CHARS = 200

/**
 * Short descriptors the client supplies but the server does not validate
 * against a list — an item's type name and language. They only ever reach the
 * model as prompt text, so the cap is what bounds what can be smuggled in.
 */
export const MAX_AI_LABEL_CHARS = 40

/**
 * Trim and truncate one field for inclusion in a prompt. Returns an empty
 * string for nullish input, so callers can test the result for emptiness rather
 * than null-checking first.
 */
export function clip(value: string | null | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max)
}
