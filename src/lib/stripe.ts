import Stripe from "stripe"

/**
 * Stripe API access and Stripe-specific configuration. The secret key and
 * price ids come from env (see `.env.example`).
 *
 * Mirrors `src/lib/r2.ts`: the client is created lazily and memoized so
 * importing this module never throws when the vars are absent (e.g. during
 * build). Only `getStripe()` throws, and only when actually used.
 *
 * `apiVersion` is deliberately omitted — stripe-node pins its own version
 * (2026-07-29.dahlia for v22.4.0) and its TypeScript types are typed to that
 * exact literal, so passing any other string is a type error.
 */

let client: Stripe | null = null

export function getStripe(): Stripe {
  if (client) return client

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY).")
  }

  client = new Stripe(secretKey, { typescript: true })
  return client
}

export type BillingInterval = "monthly" | "yearly"

/**
 * The two recurring prices on the "DevStash Pro" product: $8.00/month and
 * $72.00/year. The homepage's "$6/mo" is presentation only ($72 ÷ 12) — there
 * is deliberately no $6 price in Stripe.
 *
 * Read at module load, so an unconfigured interval surfaces as `undefined`
 * rather than an exception; callers turn that into a user-facing error.
 */
export const PRICE_IDS: Record<BillingInterval, string | undefined> = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY,
  yearly: process.env.STRIPE_PRICE_ID_YEARLY,
}

/**
 * Stripe subscription statuses that grant Pro access.
 *
 * `past_due` is deliberately excluded: a failed payment revokes Pro
 * immediately rather than keeping access through Stripe's Smart Retries.
 * `trialing` is included so that if a trial is ever configured, a trialling
 * subscriber has full access.
 */
const PRO_STATUSES = new Set(["active", "trialing"])

export function isProStatus(status: string | null | undefined): boolean {
  return status ? PRO_STATUSES.has(status) : false
}

/** Absolute base URL for Stripe redirect targets. Matches src/lib/email.ts. */
export function baseUrl(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000"
}
