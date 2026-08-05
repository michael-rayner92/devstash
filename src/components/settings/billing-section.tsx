"use client"

import { useState, useTransition } from "react"
import { AlertTriangle, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createBillingPortalSession, createCheckoutSession } from "@/actions/billing"
import type { BillingSessionResult } from "@/actions/billing"
import type { BillingInterval } from "@/lib/stripe"
import type { BillingStatus } from "@/lib/db/billing"
import { FREE_COLLECTION_LIMIT, FREE_ITEM_LIMIT } from "@/lib/usage-limits"
import { cn } from "@/lib/utils"

/**
 * Prices are in **AUD** (the currency the Stripe prices were created in), so
 * the amount is labelled rather than left as a bare `$` — Checkout will show
 * AUD and an unlabelled dollar sign invites a surprise at the payment step.
 */
const PRICING: Record<BillingInterval, { amount: string; per: string; note?: string }> = {
  monthly: { amount: "$8 AUD", per: "per month" },
  yearly: { amount: "$72 AUD", per: "per year", note: "Save 25% vs monthly" },
}

/**
 * Locale and time zone are pinned so the server-rendered string matches the
 * client's — an unpinned `toLocaleDateString` renders differently in Node and
 * the browser and trips a hydration mismatch.
 */
const dateFormat = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date)
}

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const atLimit = used >= limit
  const percent = Math.min(100, Math.round((used / limit) * 100))

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{label}</span>
        <span
          className={cn(
            "tabular-nums",
            atLimit ? "font-medium text-destructive" : "text-muted-foreground"
          )}
        >
          {used} / {limit}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full", atLimit ? "bg-destructive" : "bg-primary")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export function BillingSection({ status }: { status: BillingStatus }) {
  const [interval, setInterval] = useState<BillingInterval>("monthly")
  const [pending, startTransition] = useTransition()

  // Both actions return a Stripe-hosted URL rather than redirecting, so the
  // navigation happens here — and it's external, so a full page load.
  function go(run: () => Promise<BillingSessionResult>) {
    startTransition(async () => {
      const result = await run()
      if (result.success) {
        window.location.href = result.data.url
      } else {
        toast.error(result.error)
      }
    })
  }

  const renewsOn = formatDate(status.stripeCurrentPeriodEnd)

  if (status.isPro) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-primary" />
          <span className="font-medium">DevStash Pro</span>
          <span className="text-muted-foreground">
            &middot; unlimited items, collections, and uploads
          </span>
        </div>

        {renewsOn && (
          <p className="text-sm text-muted-foreground">
            {status.stripeSubscriptionStatus === "trialing"
              ? `Trial ends on ${renewsOn}.`
              : `Renews on ${renewsOn}.`}
          </p>
        )}

        <Button variant="outline" disabled={pending} onClick={() => go(createBillingPortalSession)}>
          {pending ? "Opening…" : "Manage subscription"}
        </Button>
      </div>
    )
  }

  // A lapsed subscription (past_due / unpaid / incomplete) reads as Free
  // because `isProStatus` only grants active and trialing — but the Stripe
  // subscription still exists. Sending these users to Checkout would create a
  // *second* subscription, so route them to the portal to fix their card.
  // A fully cancelled user has had `stripeSubscriptionId` cleared by the
  // `customer.subscription.deleted` handler, so they fall through to Upgrade.
  if (status.stripeSubscriptionId) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">There&apos;s a problem with your subscription</p>
            <p className="mt-0.5 text-muted-foreground">
              Pro features are paused
              {status.stripeSubscriptionStatus === "past_due"
                ? " because your last payment failed"
                : ` (status: ${status.stripeSubscriptionStatus ?? "unknown"})`}
              . Update your payment details to restore access.
            </p>
          </div>
        </div>

        <Button disabled={pending} onClick={() => go(createBillingPortalSession)}>
          {pending ? "Opening…" : "Update payment details"}
        </Button>
      </div>
    )
  }

  const plan = PRICING[interval]

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <UsageMeter label="Items" used={status.itemCount} limit={FREE_ITEM_LIMIT} />
        <UsageMeter
          label="Collections"
          used={status.collectionCount}
          limit={FREE_COLLECTION_LIMIT}
        />
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Upgrade to Pro</p>
            <p className="text-xs text-muted-foreground">
              Unlimited items and collections, file &amp; image uploads, AI features.
            </p>
          </div>

          {/* Interval toggle — a two-button segmented control. */}
          <div
            role="radiogroup"
            aria-label="Billing interval"
            className="inline-flex rounded-md border border-input p-0.5"
          >
            {(["monthly", "yearly"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={interval === option}
                onClick={() => setInterval(option)}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  interval === option
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <span className="text-xl font-bold">{plan.amount}</span>{" "}
            <span className="text-muted-foreground">{plan.per}</span>
            {plan.note && (
              <span className="ml-2 text-xs font-medium text-primary">{plan.note}</span>
            )}
          </p>
          <Button disabled={pending} onClick={() => go(() => createCheckoutSession(interval))}>
            {pending ? "Redirecting…" : "Upgrade to Pro"}
          </Button>
        </div>
      </div>
    </div>
  )
}
