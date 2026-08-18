import { Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

type BadgeSize = "sm" | "md"

/**
 * Amber/gold is not a new decision — the marketing homepage already brands Pro
 * with `#f59e0b` ("⚡ Pro Feature"). Colors are paired light/dark because the
 * app is dark-first but light mode is supported: an amber-300 label that reads
 * well on a dark card is far too pale on a white one.
 */
/*
 * Light-mode labels are -800 rather than -700: measured on the tinted chip
 * background, amber-700 came out at 4.48:1 — just under AA for this size.
 */
const PRO_TONE =
  "border-amber-500/50 bg-amber-500/15 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-300"

/** Free is deliberately cool-toned so it can't be mistaken for the gold Pro chip. */
const FREE_TONE =
  "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300"

const SIZES: Record<BadgeSize, string> = {
  sm: "gap-0.5 px-1.5 py-0 text-[10px] leading-[18px]",
  md: "gap-1 px-2 py-0.5 text-xs leading-5",
}

const ICON_SIZES: Record<BadgeSize, string> = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
}

const BASE =
  "inline-flex shrink-0 items-center rounded-md border font-bold uppercase tracking-wide"

interface ProBadgeProps {
  size?: BadgeSize
  /** The sparkle reads as decoration next to the word PRO — drop it where space is tight. */
  showIcon?: boolean
  className?: string
}

/**
 * The gold "PRO" chip. Used both as a plan indicator (this user is on Pro) and
 * as a gate marker (this feature requires Pro) — same meaning, same visual.
 */
export function ProBadge({ size = "md", showIcon = false, className }: ProBadgeProps) {
  return (
    <span className={cn(BASE, PRO_TONE, SIZES[size], className)}>
      {showIcon && <Sparkles className={cn(ICON_SIZES[size], "shrink-0")} aria-hidden />}
      Pro
    </span>
  )
}

interface PlanBadgeProps {
  isPro: boolean
  size?: BadgeSize
  showIcon?: boolean
  className?: string
}

/** The signed-in user's current plan. */
export function PlanBadge({ isPro, size = "md", showIcon = false, className }: PlanBadgeProps) {
  if (isPro) return <ProBadge size={size} showIcon={showIcon} className={className} />

  return <span className={cn(BASE, FREE_TONE, SIZES[size], className)}>Free</span>
}
