"use client"

import Link from "next/link"
import { AlertTriangle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProBadge } from "@/components/billing/plan-badge"
import { createBillingPortalSession } from "@/actions/billing"
import type { BillingStatus } from "@/lib/db/billing"
import { useBillingRedirect } from "@/lib/use-billing-redirect"
import { FREE_COLLECTION_LIMIT, FREE_ITEM_LIMIT } from "@/lib/usage-limits"
import { PLAN_PRICING } from "@/lib/plan-pricing"
import { cn } from "@/lib/utils"

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
  const { pending, go } = useBillingRedirect()

  const renewsOn = formatDate(status.stripeCurrentPeriodEnd)

  if (status.isPro) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm dark:border-amber-400/30 dark:bg-amber-400/10">
          <Check className="h-4 w-4 text-amber-600 dark:text-amber-300" />
          {/* No chip here — the section heading already carries one, and two
              PRO badges a few pixels apart just read as noise. */}
          <span className="font-medium text-amber-700 dark:text-amber-200">DevStash Pro</span>
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

      {/* Plan selection and checkout live on /upgrade — this box only points at
          it. Duplicating the interval toggle and a second direct-to-Stripe
          button here meant two upgrade UIs that could drift apart. The price
          still reads from PLAN_PRICING so the two can't quote different
          numbers. */}
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/6 p-4 dark:border-amber-400/30 dark:bg-amber-400/6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              Upgrade to
              <ProBadge size="sm" showIcon />
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Unlimited items and collections, file &amp; image uploads, AI features.
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {PLAN_PRICING.monthly.amount} {PLAN_PRICING.monthly.per} or{" "}
              {PLAN_PRICING.yearly.amount} {PLAN_PRICING.yearly.per} &mdash;{" "}
              {PLAN_PRICING.yearly.note?.toLowerCase()}.
            </p>
          </div>

          <Button asChild>
            <Link href="/upgrade">View plans</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
