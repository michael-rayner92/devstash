import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Tone = "primary" | "ghost" | "outline"

/**
 * Marketing-styled button. Wraps the shadcn `Button` (so `asChild` + focus /
 * disabled handling come for free) but layers the prototype's bespoke tones on
 * top. We route through the `ghost` shadcn variant — the lightest base — and
 * override its hover styles per tone. Use `asChild` + `<Link>` for navigation.
 */
const toneClass: Record<Tone, string> = {
  primary:
    "border-transparent bg-linear-to-br from-(--home-accent) to-(--home-accent-2) text-white shadow-[0_6px_20px_rgba(99,102,241,0.35)] hover:text-white hover:shadow-[0_10px_28px_rgba(99,102,241,0.5)]",
  ghost:
    "border-transparent bg-transparent text-(--home-text-dim) shadow-none hover:bg-white/5 hover:text-(--home-text)",
  outline:
    "border-(--home-border) bg-white/[0.02] text-(--home-text) shadow-none hover:border-(--home-accent) hover:bg-[rgba(99,102,241,0.08)] hover:text-(--home-text)",
}

export function HomeButton({
  tone = "primary",
  large = false,
  block = false,
  className,
  ...props
}: ComponentProps<typeof Button> & {
  tone?: Tone
  large?: boolean
  block?: boolean
}) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "h-auto rounded-[10px] border px-[18px] py-[10px] text-[0.92rem] font-semibold transition-[transform,background-color,box-shadow,border-color] duration-150 hover:-translate-y-px active:translate-y-0",
        // shadcn's default 1px `ring-ring` (~#767676) is invisible against the
        // primary tone's purple gradient and its glow shadow. A light 2px ring
        // offset from the page background reads on every tone.
        "focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-(--home-bg)",
        large && "rounded-xl px-[26px] py-[14px] text-base",
        block && "w-full",
        toneClass[tone],
        className
      )}
      {...props}
    />
  )
}
