import type { BillingInterval } from "@/lib/stripe"

/**
 * Display copy for the two Stripe prices, shared by every upgrade surface
 * (`/upgrade` and the settings billing section) so they can't drift apart.
 *
 * Amounts are labelled **AUD** — that's the currency the Stripe prices were
 * created in, and Checkout will show AUD. A bare `$` invites a surprise at the
 * payment step. Note that Stripe adaptive pricing may present a converted
 * local amount with an AUD selector.
 */
export interface PlanPrice {
  /** Headline amount, currency-labelled. */
  amount: string
  /** Period suffix, e.g. "per month". */
  per: string
  /** Savings note, where one applies. */
  note?: string
  /** Equivalent monthly rate — only meaningful for a yearly price. */
  equivalent?: string
}

export const PLAN_PRICING: Record<BillingInterval, PlanPrice> = {
  monthly: { amount: "$8 AUD", per: "per month" },
  yearly: {
    amount: "$72 AUD",
    per: "per year",
    note: "Save 25% vs monthly",
    equivalent: "Works out to $6 AUD per month",
  },
}
