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

export interface LanguageOption {
  /** Stored on the item; a canonical Monaco language id (or "" for none). */
  value: string
  label: string
}

/**
 * Languages offered in the Language dropdown. Values are canonical Monaco ids
 * so they highlight without going through LANGUAGE_ALIASES.
 */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "", label: "None" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "css", label: "CSS" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "go", label: "Go" },
  { value: "graphql", label: "GraphQL" },
  { value: "html", label: "HTML" },
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript" },
  { value: "json", label: "JSON" },
  { value: "kotlin", label: "Kotlin" },
  { value: "lua", label: "Lua" },
  { value: "markdown", label: "Markdown" },
  { value: "php", label: "PHP" },
  { value: "powershell", label: "PowerShell" },
  { value: "python", label: "Python" },
  { value: "ruby", label: "Ruby" },
  { value: "rust", label: "Rust" },
  { value: "scss", label: "SCSS" },
  { value: "shell", label: "Shell / Bash" },
  { value: "sql", label: "SQL" },
  { value: "swift", label: "Swift" },
  { value: "typescript", label: "TypeScript" },
  { value: "xml", label: "XML" },
  { value: "yaml", label: "YAML" },
]

/**
 * Options for a Language dropdown showing `current`. Items created before the
 * dropdown existed can hold any free-text language, so an unlisted value is
 * appended as its own option — selecting nothing else leaves it untouched.
 */
export function languageOptions(current?: string | null): LanguageOption[] {
  const value = current?.trim()
  if (!value || LANGUAGE_OPTIONS.some((option) => option.value === value)) {
    return LANGUAGE_OPTIONS
  }
  return [...LANGUAGE_OPTIONS, { value, label: value }]
}
