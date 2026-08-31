// Tag-string handling for the item forms, which hold tags as one
// comma-separated input rather than a list of chips.

/**
 * Split the tags input into the array the server actions expect: trimmed, with
 * blanks dropped. Duplicates are left alone — the Zod layer dedupes, and
 * removing them here would delete characters out from under someone mid-typing.
 */
export function parseTagList(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

/**
 * Append a tag to the input, adding the separator only when there is already
 * something there. Any trailing comma/whitespace the user left behind is
 * trimmed first, so accepting a suggestion after typing "react, " doesn't
 * produce "react, , hooks".
 */
export function appendTag(input: string, tag: string): string {
  const existing = input.replace(/[\s,]+$/, "")
  return existing ? `${existing}, ${tag}` : tag
}
