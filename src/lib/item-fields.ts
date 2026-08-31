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

/** Which optional fields an item type's form shows. */
export interface ItemFieldVisibility {
  /** Free-text body (snippet, prompt, command, note). */
  content: boolean
  /** Language dropdown, and syntax highlighting in the editor (snippet, command). */
  language: boolean
  /** URL input — required for link items. */
  url: boolean
  /** File upload instead of a text/url body (file, image). */
  file: boolean
}

/**
 * The field visibility for one item type, in one place. Both item forms need
 * these flags twice over — to decide what to render, and to null out the fields
 * a type doesn't carry when building the submit payload — so deriving them
 * inline meant four copies of the same four rules.
 */
export function itemFieldVisibility(typeName: string): ItemFieldVisibility {
  return {
    content: CONTENT_TYPES.has(typeName),
    language: isCodeType(typeName),
    url: typeName === "link",
    file: isFileType(typeName),
  }
}
