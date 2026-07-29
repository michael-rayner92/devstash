import type { LucideIcon } from "lucide-react"
import { Code2, Sparkles, Search, Terminal, FileText, FolderOpen } from "lucide-react"

/**
 * Prototype marketing accent colors, referenced as scoped CSS vars (defined on
 * `.home` in globals.css). Defined once here and reused across the features
 * grid, the dashboard-preview mini-cards, and the AI tags. These are the
 * prototype's marketing values and intentionally differ from the app's system
 * item-type colors.
 */
export const TYPE_COLOR = {
  snippet: "var(--home-snippet)",
  prompt: "var(--home-prompt)",
  command: "var(--home-command)",
  note: "var(--home-note)",
  file: "var(--home-file)",
  image: "var(--home-image)",
  url: "var(--home-url)",
} as const

/** Real routes every homepage CTA resolves to. */
export const ROUTES = {
  signIn: "/sign-in",
  register: "/register",
  dashboard: "/dashboard",
} as const

export interface Feature {
  title: string
  description: string
  icon: LucideIcon
  color: string
}

export const FEATURES: Feature[] = [
  {
    title: "Code Snippets",
    description: "Syntax-highlighted snippets with language tags, ready to copy in one click.",
    icon: Code2,
    color: TYPE_COLOR.snippet,
  },
  {
    title: "AI Prompts",
    description: "Save the prompts that actually work — refine, version, and reuse them anywhere.",
    icon: Sparkles,
    color: TYPE_COLOR.prompt,
  },
  {
    title: "Instant Search",
    description: "Fuzzy search across titles, content, tags, and types. Keyboard-first, ⌘K away.",
    icon: Search,
    color: TYPE_COLOR.url,
  },
  {
    title: "Commands",
    description: "That one Docker incantation you always forget — stashed, searchable, one tap to copy.",
    icon: Terminal,
    color: TYPE_COLOR.command,
  },
  {
    title: "Files & Docs",
    description: "Upload context files, images, and docs — served fast and kept beside your code.",
    icon: FileText,
    color: TYPE_COLOR.file,
  },
  {
    title: "Collections",
    description: "Group related items across types. One snippet can live in many collections at once.",
    icon: FolderOpen,
    color: TYPE_COLOR.note,
  },
]

export interface MiniCard {
  tag: string
  title: string
  color: string
}

/** Item cards shown in the "…with DevStash" dashboard preview. */
export const MINI_CARDS: MiniCard[] = [
  { tag: "Snippet", title: "useDebounce hook", color: TYPE_COLOR.snippet },
  { tag: "Prompt", title: "Code reviewer", color: TYPE_COLOR.prompt },
  { tag: "Command", title: "Deploy to prod", color: TYPE_COLOR.command },
  { tag: "Note", title: "Postgres tips", color: TYPE_COLOR.note },
  { tag: "Image", title: "Arch diagram", color: TYPE_COLOR.image },
  { tag: "Link", title: "Prisma docs", color: TYPE_COLOR.url },
]

export interface DashNavItem {
  label: string
  color: string
  active?: boolean
}

/** Sidebar nav rows in the dashboard preview. */
export const DASH_NAV: DashNavItem[] = [
  { label: "Snippets", color: TYPE_COLOR.snippet, active: true },
  { label: "Prompts", color: TYPE_COLOR.prompt },
  { label: "Commands", color: TYPE_COLOR.command },
  { label: "Notes", color: TYPE_COLOR.note },
  { label: "Links", color: TYPE_COLOR.url },
]

export interface AiTag {
  label: string
  color: string
}

export const AI_TAGS: AiTag[] = [
  { label: "react", color: TYPE_COLOR.snippet },
  { label: "hooks", color: TYPE_COLOR.snippet },
  { label: "typescript", color: TYPE_COLOR.url },
  { label: "performance", color: TYPE_COLOR.note },
  { label: "debounce", color: TYPE_COLOR.prompt },
]

export const AI_CAPABILITIES: string[] = [
  "Auto-tag suggestions from content",
  "TL;DR summaries for long items",
  "Explain-this-code, inline",
  "Prompt optimizer for better output",
]

export interface PlanFeature {
  /** Optional bold lead-in (e.g. "Unlimited"). */
  strong?: string
  label: string
  included: boolean
}

export const FREE_PLAN = {
  name: "Free",
  amount: "$0",
  per: "/forever",
  tagline: "Everything you need to get organized.",
  cta: { label: "Get Started", href: ROUTES.register },
  features: [
    { label: "Up to 50 items", included: true },
    { label: "3 collections", included: true },
    { label: "Snippets, prompts, commands, notes, links", included: true },
    { label: "Instant search", included: true },
    { label: "File & image uploads", included: false },
    { label: "AI features", included: false },
  ] satisfies PlanFeature[],
}

/** Billing-period-dependent copy for the Pro plan, driven by <PricingToggle>. */
export const PRO_PRICING = {
  monthly: { amount: "$8", per: "/month", tagline: "Billed monthly. Cancel anytime." },
  yearly: { amount: "$6", per: "/mo, billed yearly", tagline: "$72 billed annually. Save 25%." },
} as const

export const PRO_PLAN = {
  name: "Pro",
  cta: { label: "Start Pro Trial", href: ROUTES.register },
  features: [
    { strong: "Unlimited", label: "items & collections", included: true },
    { label: "File & image uploads", included: true },
    { label: "AI auto-tagging & summaries", included: true },
    { label: "Explain code & prompt optimizer", included: true },
    { label: "Data export (JSON / ZIP)", included: true },
    { label: "Priority support", included: true },
  ] satisfies PlanFeature[],
}

export interface FooterLink {
  label: string
  href: string
}

export interface FooterColumn {
  title: string
  links: FooterLink[]
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "#" },
      { label: "Guides", href: "#" },
      { label: "API", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
]
