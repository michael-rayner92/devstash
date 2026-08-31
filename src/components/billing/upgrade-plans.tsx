"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProBadge } from "@/components/billing/plan-badge"
import { createCheckoutSession } from "@/actions/billing"
import type { BillingInterval } from "@/lib/stripe"
import { useBillingRedirect } from "@/lib/use-billing-redirect"
import { PLAN_PRICING } from "@/lib/plan-pricing"
// Feature lists are reused from the marketing homepage's pricing data so the
// two surfaces can't advertise different things. Only the data is shared — the
// homepage styling lives under its own `.home` scoped palette.
import { FREE_PLAN, PRO_PLAN, type PlanFeature } from "@/components/home/data"
import { cn } from "@/lib/utils"

const INTERVALS: BillingInterval[] = ["monthly", "yearly"]

function FeatureRow({ feature }: { feature: PlanFeature }) {
  const Icon = feature.included ? Check : X
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 text-sm",
        feature.included ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
          feature.included
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-3 w-3" />
      </span>
      <span>
        {feature.strong ? <strong className="font-semibold">{feature.strong} </strong> : null}
        {feature.label}
      </span>
    </li>
  )
}

export function UpgradePlans() {
  const [interval, setInterval] = useState<BillingInterval>("monthly")
  const { pending, go } = useBillingRedirect()

  const price = PLAN_PRICING[interval]

  function checkout() {
    go(() => createCheckoutSession(interval))
  }

  return (
    <div className="space-y-6">
      {/* Billing period — a segmented control, matching the settings section. */}
      <div className="flex flex-col items-center gap-2">
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="inline-flex rounded-lg border border-input p-1"
        >
          {INTERVALS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={interval === option}
              onClick={() => setInterval(option)}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                interval === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option}
              {option === "yearly" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    interval === "yearly"
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  Save 25%
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {price.equivalent ?? "Cancel anytime from your billing settings."}
        </p>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
        {/* Free — what the user has today. */}
        <article className="flex h-full flex-col rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{FREE_PLAN.name}</h2>
            <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Current plan
            </span>
          </div>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight">$0</span>
            <span className="text-sm text-muted-foreground">forever</span>
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">{FREE_PLAN.tagline}</p>
          <ul className="mt-6 flex flex-1 flex-col gap-3">
            {FREE_PLAN.features.map((feature) => (
              <FeatureRow key={feature.label} feature={feature} />
            ))}
          </ul>
        </article>

        {/* Pro — the offer. */}
        <article className="flex h-full flex-col rounded-xl border border-amber-500/50 bg-amber-500/5 p-6 dark:border-amber-400/40 dark:bg-amber-400/5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{PRO_PLAN.name}</h2>
            <ProBadge showIcon />
          </div>
          <p className="mt-3 flex flex-wrap items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight">{price.amount}</span>
            <span className="text-sm text-muted-foreground">{price.per}</span>
            {price.note && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {price.note}
              </span>
            )}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Everything in Free, plus uploads, AI, and no limits.
          </p>
          <ul className="mt-6 flex flex-1 flex-col gap-3">
            {PRO_PLAN.features.map((feature) => (
              <FeatureRow key={feature.label} feature={feature} />
            ))}
          </ul>
          <Button className="mt-6 w-full" disabled={pending} onClick={checkout}>
            {pending ? "Redirecting…" : `Upgrade — ${price.amount} ${price.per}`}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Secure checkout by Stripe. Cancel anytime.
          </p>
        </article>
      </div>
    </div>
  )
}
