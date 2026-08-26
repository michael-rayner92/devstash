// Field visibility rules shared across the item create dialog and edit form.

/** Item types that carry a free-text body. */
export const CONTENT_TYPES = new Set(["snippet", "prompt", "command", "note"])

/** Item types that carry a `language` and render in the code editor. */
export const LANGUAGE_TYPES = new Set(["snippet", "command"])

/** Item types whose body is Markdown and render in the tabbed markdown editor. */
export const MARKDOWN_TYPES = new Set(["note", "prompt"])

/** Item types backed by an uploaded file in R2 (file, image). */
export const FILE_TYPES = new Set(["file", "image"])

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

/**
 * File types (file, image) upload a payload to R2 instead of carrying a
 * text/url body, and render the file upload UI.
 */
export function isFileType(typeName: string): boolean {
  return FILE_TYPES.has(typeName)
}

/**
 * Prompt items — the only type the AI prompt optimizer applies to.
 *
 * Narrower than `isMarkdownType`, which also covers notes: both render in the
 * markdown editor, but only a prompt is a set of instructions for an AI, which
 * is what there is to optimize. Kept as a named helper rather than an inline
 * `=== "prompt"` so the UI and the server action gate on the same predicate.
 */
export function isPromptType(typeName: string): boolean {
  return typeName === "prompt"
}
