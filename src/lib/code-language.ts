// Maps user-entered language names to Monaco language ids for syntax highlighting.
// Monaco is forgiving — an unknown id simply yields no highlighting — so this only
// needs to cover common aliases that differ from Monaco's canonical ids.

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  py: "python",
  rb: "ruby",
  yml: "yaml",
  md: "markdown",
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  golang: "go",
}

/**
 * Normalize a free-text language label (e.g. "TypeScript", "sh", "js") to a
 * Monaco language id. Falls back to the lowercased input, or "plaintext" when empty.
 */
export function monacoLanguage(language?: string | null): string {
  if (!language) return "plaintext"
  const key = language.trim().toLowerCase()
  if (!key) return "plaintext"
  return LANGUAGE_ALIASES[key] ?? key
}
