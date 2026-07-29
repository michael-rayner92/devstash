import type { ComponentType, ReactNode } from "react"

/**
 * Brand-specific inline SVGs with no clean lucide-react equivalent: the
 * DevStash archive-box logo and the scattered "chaos source" glyphs (Notion,
 * GitHub, Slack, VS Code, Tabs, Terminal, text file, Bookmark). Feature icons
 * use lucide-react (see data.ts) — only these bespoke marks stay custom.
 */

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7l4-4h8l4 4" />
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 12h8M8 16h5" />
    </svg>
  )
}

function ChaosGlyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function NotionIcon() {
  return (
    <ChaosGlyph>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 8v8M9 8l6 8M15 8v8" />
    </ChaosGlyph>
  )
}

function GitHubIcon() {
  return (
    <ChaosGlyph>
      <path d="M9 19c-4 1.5-4-2-5-2m10 4v-3.5c0-1 .1-1.4-.5-2 2.3-.3 4.5-1.1 4.5-5a3.9 3.9 0 0 0-1-2.7 3.6 3.6 0 0 0-.1-2.7s-.9-.3-3 1a10.4 10.4 0 0 0-5 0c-2.1-1.3-3-1-3-1a3.6 3.6 0 0 0-.1 2.7A3.9 3.9 0 0 0 4 10c0 3.9 2.2 4.7 4.5 5-.6.6-.6 1.2-.5 2V21" />
    </ChaosGlyph>
  )
}

function SlackIcon() {
  return (
    <ChaosGlyph>
      <rect x="10" y="3" width="4" height="10" rx="2" />
      <rect x="3" y="10" width="10" height="4" rx="2" />
      <rect x="11" y="11" width="4" height="10" rx="2" />
      <rect x="11" y="10" width="10" height="4" rx="2" />
    </ChaosGlyph>
  )
}

function CodeIcon() {
  return (
    <ChaosGlyph>
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </ChaosGlyph>
  )
}

function TabsIcon() {
  return (
    <ChaosGlyph>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M8 5v4" />
    </ChaosGlyph>
  )
}

function TerminalIcon() {
  return (
    <ChaosGlyph>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9l3 3-3 3M13 15h4" />
    </ChaosGlyph>
  )
}

function TxtFileIcon() {
  return (
    <ChaosGlyph>
      <path d="M14 3v5h5" />
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M8 13h8M8 17h5" />
    </ChaosGlyph>
  )
}

function BookmarkIcon() {
  return (
    <ChaosGlyph>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </ChaosGlyph>
  )
}

export interface ChaosSource {
  label: string
  Icon: ComponentType
}

/** Scattered developer-knowledge sources animated in the hero's chaos box. */
export const CHAOS_SOURCES: ChaosSource[] = [
  { label: "Notion", Icon: NotionIcon },
  { label: "GitHub", Icon: GitHubIcon },
  { label: "Slack", Icon: SlackIcon },
  { label: "VS Code", Icon: CodeIcon },
  { label: "Tabs", Icon: TabsIcon },
  { label: "Terminal", Icon: TerminalIcon },
  { label: "text.txt", Icon: TxtFileIcon },
  { label: "Bookmark", Icon: BookmarkIcon },
]
