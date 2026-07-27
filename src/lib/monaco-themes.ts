import type { Monaco } from "@monaco-editor/react"
import type { EditorTheme } from "@/lib/editor-preferences"

/**
 * Monaco theme definitions for the three selectable editor themes, plus the
 * chrome (container + header) colors so the editor's macOS-style header blends
 * with each theme's editor background. All themes are dark (the editor chrome is
 * intentionally always dark, VS Code style, regardless of the app theme).
 */

interface ThemeChrome {
  /** Monaco theme name registered via defineTheme. */
  monacoTheme: string
  /** Editor + container background. */
  editorBg: string
  /** Header (traffic-light) background. */
  headerBg: string
}

// Monaco theme names we register. vs-dark maps to our tuned devstash variant so
// its background matches the chrome; monokai/github-dark are full custom themes.
const THEME_NAMES: Record<EditorTheme, string> = {
  "vs-dark": "devstash-vs-dark",
  monokai: "devstash-monokai",
  "github-dark": "devstash-github-dark",
}

export const EDITOR_CHROME: Record<EditorTheme, ThemeChrome> = {
  "vs-dark": {
    monacoTheme: THEME_NAMES["vs-dark"],
    editorBg: "#1a1a1a",
    headerBg: "#212121",
  },
  monokai: {
    monacoTheme: THEME_NAMES.monokai,
    editorBg: "#272822",
    headerBg: "#1e1f1c",
  },
  "github-dark": {
    monacoTheme: THEME_NAMES["github-dark"],
    editorBg: "#0d1117",
    headerBg: "#161b22",
  },
}

/** Register all three custom themes. Call once from Monaco's `beforeMount`. */
export function defineEditorThemes(monaco: Monaco): void {
  monaco.editor.defineTheme(THEME_NAMES["vs-dark"], {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1a1a1a",
      "editor.foreground": "#e5e5e5",
      "editorGutter.background": "#1a1a1a",
      "editorLineNumber.foreground": "#4d4d4d",
      "editorLineNumber.activeForeground": "#a3a3a3",
      "editorCursor.foreground": "#e5e5e5",
      "editor.selectionBackground": "#264f7855",
      "editor.lineHighlightBackground": "#ffffff08",
      "editorWidget.background": "#1f1f1f",
      "editorWidget.border": "#ffffff1a",
      "scrollbarSlider.background": "#ffffff1a",
      "scrollbarSlider.hoverBackground": "#ffffff33",
      "scrollbarSlider.activeBackground": "#ffffff4d",
    },
  })

  monaco.editor.defineTheme(THEME_NAMES.monokai, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "75715e" },
      { token: "string", foreground: "e6db74" },
      { token: "keyword", foreground: "f92672" },
      { token: "number", foreground: "ae81ff" },
      { token: "type", foreground: "66d9ef", fontStyle: "italic" },
      { token: "function", foreground: "a6e22e" },
      { token: "variable", foreground: "f8f8f2" },
    ],
    colors: {
      "editor.background": "#272822",
      "editor.foreground": "#f8f8f2",
      "editorGutter.background": "#272822",
      "editorLineNumber.foreground": "#90908a",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editorCursor.foreground": "#f8f8f0",
      "editor.selectionBackground": "#49483e",
      "editor.lineHighlightBackground": "#3e3d32",
      "editorWidget.background": "#1e1f1c",
      "editorWidget.border": "#ffffff1a",
      "scrollbarSlider.background": "#ffffff1a",
      "scrollbarSlider.hoverBackground": "#ffffff33",
      "scrollbarSlider.activeBackground": "#ffffff4d",
    },
  })

  monaco.editor.defineTheme(THEME_NAMES["github-dark"], {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8b949e" },
      { token: "string", foreground: "a5d6ff" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "number", foreground: "79c0ff" },
      { token: "type", foreground: "ffa657" },
      { token: "function", foreground: "d2a8ff" },
      { token: "variable", foreground: "c9d1d9" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#c9d1d9",
      "editorGutter.background": "#0d1117",
      "editorLineNumber.foreground": "#484f58",
      "editorLineNumber.activeForeground": "#c9d1d9",
      "editorCursor.foreground": "#c9d1d9",
      "editor.selectionBackground": "#264f7855",
      "editor.lineHighlightBackground": "#ffffff08",
      "editorWidget.background": "#161b22",
      "editorWidget.border": "#ffffff1a",
      "scrollbarSlider.background": "#ffffff1a",
      "scrollbarSlider.hoverBackground": "#ffffff33",
      "scrollbarSlider.activeBackground": "#ffffff4d",
    },
  })
}
