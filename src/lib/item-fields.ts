// Field visibility rules shared across the item create dialog and edit form.

/** Item types that carry a free-text body. */
export const CONTENT_TYPES = new Set(["snippet", "prompt", "command", "note"])

/** Item types that carry a `language` and render in the code editor. */
export const LANGUAGE_TYPES = new Set(["snippet", "command"])

/** Item types whose body is Markdown and render in the tabbed markdown editor. */
export const MARKDOWN_TYPES = new Set(["note", "prompt"])

/**
 * Code types show the Monaco editor instead of a plain textarea. Currently
 * identical to the language-bearing types (snippet, command).
 */
export function isCodeType(typeName: string): boolean {
  return LANGUAGE_TYPES.has(typeName)
}

/**
 * Markdown types show the Write/Preview markdown editor instead of a plain
 * textarea (note, prompt).
 */
export function isMarkdownType(typeName: string): boolean {
  return MARKDOWN_TYPES.has(typeName)
}
