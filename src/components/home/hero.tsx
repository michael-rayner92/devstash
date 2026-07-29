import type { CSSProperties } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Reveal } from "./reveal"
import { HomeButton } from "./home-button"
import { ChaosAnimation } from "./chaos-animation"
import { DASH_NAV, MINI_CARDS, ROUTES } from "./data"

function PanelLabel({ children }: { children: string }) {
  return (
    <span className="mb-3 block text-left text-[0.82rem] font-semibold text-(--home-text-mute)">
      {children}
    </span>
  )
}

/** The "…with DevStash" static dashboard preview (order half of the visual). */
function DashboardPreview() {
  return (
    <div className="grid h-80 grid-cols-[118px_1fr] overflow-hidden rounded-[20px] border border-(--home-border) bg-(--home-bg-elev) text-left shadow-[0_0_0_1px_rgba(99,102,241,0.35),0_20px_60px_rgba(99,102,241,0.18)]">
      <aside className="border-r border-(--home-border) bg-black/20 px-2.5 py-3.5">
        <div className="mb-3.5 flex items-center gap-1.5 text-[0.72rem] font-bold text-(--home-text)">
          <span className="h-3 w-3 rounded bg-linear-to-br from-(--home-accent) to-(--home-accent-2)" />
          DevStash
        </div>
        <div className="flex flex-col gap-1">
          {DASH_NAV.map((nav) => (
            <span
              key={nav.label}
              className={`flex items-center gap-[7px] rounded-[7px] px-[7px] py-[5px] text-[0.68rem] ${
                nav.active
                  ? "bg-white/5 text-(--home-text)"
                  : "text-(--home-text-mute)"
              }`}
            >
              <i
                className="h-2 w-2 flex-none rounded-[2px]"
                style={{ background: nav.color }}
              />
              {nav.label}
            </span>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-2.5 p-3">
        <div className="flex items-center justify-between rounded-lg border border-(--home-border) px-[9px] py-1.5 text-[0.66rem] text-(--home-text-mute)">
          <span>Search everything…</span>
          <kbd className="rounded border border-(--home-border) px-[5px] py-px font-mono text-[0.6rem]">
            ⌘K
          </kbd>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MINI_CARDS.map((card) => (
            <div
              key={card.tag}
              className="flex flex-col gap-[5px] rounded-lg border border-t-[3px] border-(--home-border) border-t-(--c) bg-(--home-bg-card) p-2"
              style={{ "--c": card.color } as CSSProperties}
            >
              <span className="text-[0.55rem] font-bold uppercase tracking-[0.04em] text-(--c)">
                {card.tag}
              </span>
              <span className="truncate text-[0.66rem] font-semibold text-(--home-text)">
                {card.title}
              </span>
              <span className="h-1 rounded-[2px] bg-linear-to-r from-(--home-border) from-60% to-transparent" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="mx-auto grid max-w-[1180px] place-items-center gap-11 px-6 pb-[60px] pt-[calc(66px+64px)] text-center">
      <Reveal>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-(--home-border) bg-white/[0.04] px-3.5 py-1.5 text-[0.82rem] font-medium text-(--home-text-dim)">
          ✨ Your developer second brain
        </span>
        <h1 className="mt-5 text-[clamp(2.4rem,6vw,4.1rem)] font-extrabold leading-[1.15] tracking-[-0.02em]">
          Stop Losing Your{" "}
          <span className="block bg-linear-to-r from-[#818cf8] via-[#c084fc] to-[#f472b6] bg-clip-text text-transparent">
            Developer Knowledge
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-[1.08rem] text-(--home-text-dim)">
          Snippets in VS Code. Prompts buried in chat history. Commands in a
          random{" "}
          <code className="rounded bg-white/[0.06] px-[0.4em] py-[0.1em] font-mono text-[0.85em]">
            .txt
          </code>
          . Links no one ever reopens. DevStash pulls it all into one fast,
          searchable, AI-enhanced hub.
        </p>
        <div className="mt-[30px] flex flex-wrap justify-center gap-3.5">
          <HomeButton asChild tone="primary" large>
            <Link href={ROUTES.register}>Get Started Free</Link>
          </HomeButton>
          <HomeButton asChild tone="outline" large>
            <Link href="#features">See how it works</Link>
          </HomeButton>
        </div>
        <p className="mt-4 text-[0.85rem] text-(--home-text-mute)">
          No credit card required · Free forever tier
        </p>
      </Reveal>

      <Reveal className="w-full">
        <div
          aria-hidden="true"
          className="grid grid-cols-1 items-center gap-[22px] lg:grid-cols-[1fr_auto_1fr]"
        >
          {/* Chaos */}
          <div className="min-w-0">
            <PanelLabel>Your knowledge today…</PanelLabel>
            <ChaosAnimation />
          </div>

          {/* Arrow */}
          <div
            aria-hidden="true"
            className="home-arrow grid h-[60px] w-[60px] justify-self-center place-items-center rounded-full bg-linear-to-br from-(--home-accent) to-(--home-accent-2) text-white"
          >
            <ArrowRight className="size-[34px]" strokeWidth={2.5} />
          </div>

          {/* Order */}
          <div className="min-w-0">
            <PanelLabel>…with DevStash</PanelLabel>
            <DashboardPreview />
          </div>
        </div>
      </Reveal>
    </section>
  )
}
