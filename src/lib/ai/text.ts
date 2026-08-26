/**
 * Normalizers shared by more than one AI feature's output parser.
 *
 * Pure, like the per-feature modules that import it — no `openai`, no I/O.
 */

/**
 * Drop a ```-fenced wrapper around an entire reply, keeping the body.
 *
 * Models wrap their whole answer in a fence often enough that both the code
 * explainer and the prompt optimizer have to undo it: left in place it renders
 * the explanation as a literal code block, and saves a prompt with stray
 * backticks around it.
 *
 * Guarded on the body containing no fence of its own. A reply legitimately
 * *includes* fenced code, and in `` ```js\nfoo()\n```\n\nsome prose `` the
 * regex's lazy body would match only `foo()` and silently throw the prose away.
 * If any fence survives inside the body, the outer one wasn't a wrapper — leave
 * the text exactly as it came.
 */
export function stripOuterFence(text: string): string {
  const match = /^```[^\n]*\n([\s\S]*?)\n?```$/.exec(text)
  if (!match) return text
  const body = match[1].trim()
  return body.includes("```") ? text : body
}

/**
 * Drop matching straight or curly quotes wrapping an entire reply.
 *
 * Models quote a whole answer often enough to be worth undoing — the optimizer
 * was observed returning its rewrite wrapped in `"…"`, which would have saved
 * stray quote marks into the user's prompt.
 *
 * `onlyIfInteriorIsQuoteFree` decides how cautious to be, and the two callers
 * genuinely differ. A one-sentence description can't plausibly open and close
 * with *unrelated* quotes, so it strips unconditionally. A multi-paragraph
 * prompt can — `"Hello" is the greeting. Reply with "Goodbye"` starts and ends
 * with a quote without being wrapped in one — and corrupting a saved prompt is
 * far worse than leaving a cosmetic wart, so it strips only when the interior
 * holds no quote of the same kind.
 */
export function stripWrappingQuotes(
  text: string,
  { onlyIfInteriorIsQuoteFree = false }: { onlyIfInteriorIsQuoteFree?: boolean } = {}
): string {
  const pairs: [string, string][] = [
    ['"', '"'],
    ["'", "'"],
    ["“", "”"],
  ]
  for (const [open, close] of pairs) {
    if (text.length > 1 && text.startsWith(open) && text.endsWith(close)) {
      const interior = text.slice(1, -1)
      if (onlyIfInteriorIsQuoteFree && (interior.includes(open) || interior.includes(close))) {
        continue
      }
      return interior.trim()
    }
  }
  return text
}
