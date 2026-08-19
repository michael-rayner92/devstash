import { prisma } from "@/lib/prisma"

/**
 * Billing reads and writes. Every function takes `userId` first and scopes to
 * it, matching the convention in the other `src/lib/db/*` modules — actions
 * validate, this layer enforces ownership.
 *
 * The one exception is `findUserByStripeCustomerId`, which resolves in the
 * other direction for Phase 2's webhook (a webhook carries a Stripe customer
 * id, not a session).
 */

export type BillingStatus = {
  isPro: boolean
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripeSubscriptionStatus: string | null
  stripePriceId: string | null
  /** ISO string, serializable for the client. */
  stripeCurrentPeriodEnd: string | null
  itemCount: number
  collectionCount: number
}

/** Everything the settings billing section needs, in one round trip set. */
export async function getBillingStatus(userId: string): Promise<BillingStatus | null> {
  const [user, itemCount, collectionCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        isPro: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeSubscriptionStatus: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
      },
    }),
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
  ])

  if (!user) return null

  return {
    ...user,
    stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd?.toISOString() ?? null,
    itemCount,
    collectionCount,
  }
}

export type PlanUsage = {
  isPro: boolean
  itemCount: number
  collectionCount: number
}

/** Lightweight plan + usage read for the create-path gates (Phase 2). */
export async function getPlanUsage(userId: string): Promise<PlanUsage | null> {
  const [user, itemCount, collectionCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { isPro: true } }),
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
  ])

  if (!user) return null

  return { isPro: user.isPro, itemCount, collectionCount }
}

/**
 * Just the plan flag. Purpose-built for the AI gates, which need `isPro` and
 * nothing else — `getPlanUsage` would add two `count` queries per call for
 * numbers no AI gate reads. Returns null when the user row is gone.
 */
export async function getIsPro(userId: string): Promise<boolean | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPro: true },
  })
  return user ? user.isPro : null
}

/** Persist the Stripe customer id for a user. */
export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId } })
}

/**
 * Resolve a webhook's customer id back to our user. Returns null for unknown
 * customers (e.g. events from another environment sharing the same Stripe
 * account), which the webhook treats as a no-op rather than an error.
 */
export async function findUserByStripeCustomerId(
  stripeCustomerId: string
): Promise<{ id: string } | null> {
  return prisma.user.findUnique({
    where: { stripeCustomerId },
    select: { id: true },
  })
}

/**
 * Confirm a user id exists before the webhook writes to it.
 *
 * The webhook's fallback path trusts a `userId` carried in Stripe metadata,
 * which may have been written by a different environment sharing this Stripe
 * account. Without this check, `syncSubscription` would throw on a missing row
 * and the route would 500 — putting Stripe into a retry loop over an event it
 * can never deliver successfully.
 */
export async function userExists(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  return user !== null
}

export interface SubscriptionSync {
  isPro: boolean
  stripeSubscriptionId: string | null
  stripeSubscriptionStatus: string | null
  stripePriceId: string | null
  stripeCurrentPeriodEnd: Date | null
}

/**
 * Apply a subscription state to a user. Idempotent — Stripe redelivers
 * webhooks, and these are absolute values rather than deltas, so writing the
 * same state twice is a no-op.
 */
export async function syncSubscription(
  userId: string,
  data: SubscriptionSync
): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data })
}
