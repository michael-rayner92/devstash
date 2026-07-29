"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Reveal } from "./reveal"
import { HomeButton } from "./home-button"
import { FREE_PLAN, PRO_PLAN, PRO_PRICING, type PlanFeature } from "./data"

function FeatureRow({ feature }: { feature: PlanFeature }) {
  return (
    <li className="flex items-center gap-[11px] text-[0.94rem] text-(--home-text-dim)">
      <span
        className={cn(
          "grid h-[22px] w-[22px] flex-none place-items-center rounded-full text-[0.72rem] font-bold",
          feature.included
            ? "bg-[rgba(34,197,94,0.14)] text-(--home-note)"
            : "bg-white/5 text-(--home-text-mute)"
        )}
      >
        {feature.included ? "✓" : "✕"}
      </span>
      <span>
        {feature.strong ? (
          <>
            <strong className="text-(--home-text)">{feature.strong}</strong>{" "}
          </>
        ) : null}
        {feature.label}
      </span>
    </li>
  )
}

interface PlanCardProps {
  name: string
  amount: string
  per: string
  tagline: string
  features: PlanFeature[]
  cta: { label: string; href: string }
  popular?: boolean
}

function PlanCard({
  name,
  amount,
  per,
  tagline,
  features,
  cta,
  popular,
}: PlanCardProps) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-[20px] border bg-(--home-bg-card) px-7 py-8",
        popular
          ? "border-(--home-accent) shadow-[0_0_0_1px_rgba(99,102,241,0.35),0_20px_60px_rgba(99,102,241,0.18)]"
          : "border-(--home-border)"
      )}
    >
      {popular ? (
        <span className="absolute -top-[13px] left-1/2 -translate-x-1/2 rounded-full bg-linear-to-br from-(--home-accent) to-(--home-accent-2) px-3.5 py-[5px] text-[0.72rem] font-bold uppercase tracking-[0.05em] text-white shadow-[0_6px_18px_rgba(99,102,241,0.4)]">
          Most Popular
        </span>
      ) : null}
      <h3 className="text-[1.3rem] font-bold">{name}</h3>
      <p className="mb-1.5 mt-3.5 flex items-baseline gap-1">
        <span className="text-[2.8rem] font-extrabold tracking-[-0.03em]">
          {amount}
        </span>
        <span className="text-[0.95rem] text-(--home-text-mute)">{per}</span>
      </p>
      <p className="mb-[22px] text-[0.9rem] text-(--home-text-dim)">{tagline}</p>
      <ul className="mb-[26px] flex flex-1 flex-col gap-3">
        {features.map((feature) => (
          <FeatureRow key={feature.label} feature={feature} />
        ))}
      </ul>
      <HomeButton asChild tone={popular ? "primary" : "outline"} block>
        <Link href={cta.href}>{cta.label}</Link>
      </HomeButton>
    </article>
  )
}

/**
 * Owns the monthly/yearly billing state. Renders the switch (in the section
 * head) plus both plan cards, since toggling the switch rewrites the Pro
 * plan's price, period, and tagline.
 */
export function PricingToggle() {
  const [yearly, setYearly] = useState(false)
  const pro = yearly ? PRO_PRICING.yearly : PRO_PRICING.monthly

  return (
    <>
      <div
        role="group"
        aria-label="Billing period"
        className="mt-[26px] flex items-center justify-center gap-3.5"
      >
        <span
          className={cn(
            "text-[0.95rem] font-semibold transition-colors",
            yearly ? "text-(--home-text-mute)" : "text-(--home-text)"
          )}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={yearly}
          aria-label="Toggle yearly billing"
          onClick={() => setYearly((value) => !value)}
          className={cn(
            "relative h-7 w-[50px] flex-none cursor-pointer rounded-full border transition-[background-color,border-color]",
            yearly
              ? "border-transparent bg-linear-to-br from-(--home-accent) to-(--home-accent-2)"
              : "border-(--home-border) bg-(--home-bg-elev)"
          )}
        >
          <span
            className={cn(
              "absolute left-0.5 top-0.5 h-[22px] w-[22px] rounded-full bg-white transition-transform",
              yearly && "translate-x-[22px]"
            )}
          />
        </button>
        <span
          className={cn(
            "flex items-center gap-2 text-[0.95rem] font-semibold transition-colors",
            yearly ? "text-(--home-text)" : "text-(--home-text-mute)"
          )}
        >
          Yearly
          <span className="rounded-full border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.15)] px-2 py-0.5 text-[0.68rem] font-bold text-(--home-note)">
            Save 25%
          </span>
        </span>
      </div>

      <div className="mx-auto mt-12 grid max-w-[782px] grid-cols-1 items-stretch justify-center gap-[22px] md:grid-cols-2">
        <Reveal className="h-full">
          <PlanCard
            name={FREE_PLAN.name}
            amount={FREE_PLAN.amount}
            per={FREE_PLAN.per}
            tagline={FREE_PLAN.tagline}
            features={FREE_PLAN.features}
            cta={FREE_PLAN.cta}
          />
        </Reveal>
        <Reveal className="h-full">
          <PlanCard
            name={PRO_PLAN.name}
            amount={pro.amount}
            per={pro.per}
            tagline={pro.tagline}
            features={PRO_PLAN.features}
            cta={PRO_PLAN.cta}
            popular
          />
        </Reveal>
      </div>
    </>
  )
}
