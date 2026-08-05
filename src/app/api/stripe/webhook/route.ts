import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { getStripe, isProStatus } from "@/lib/stripe"
import {
  findUserByStripeCustomerId,
  syncSubscription,
  userExists,
} from "@/lib/db/billing"
import type { SubscriptionSync } from "@/lib/db/billing"

/**
 * Stripe webhook receiver. Unauthenticated by design — the `stripe-signature`
 * header is the auth, and the proxy matcher already excludes `/api`. Never
 * call `auth()` here; Stripe cannot carry a session.
 *
 * Node runtime is required: signature verification needs the raw request body,
 * read via `req.text()` before anything else parses it.
 */
export const runtime = "nodejs"

/** Map a Stripe subscription onto our user columns. */
function subscriptionSync(sub: Stripe.Subscription): SubscriptionSync {
  const item = sub.items.data[0]
  return {
    isPro: isProStatus(sub.status),
    stripeSubscriptionId: sub.id,
    stripeSubscriptionStatus: sub.status,
    stripePriceId: item?.price.id ?? null,
    // ⚠️ `current_period_end` lives on the subscription ITEM, not the
    // subscription, as of API version 2025-10-29.clover onward. Reading
    // `sub.current_period_end` stores null forever, and fails silently
    // because the column is nullable.
    stripeCurrentPeriodEnd: item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null,
  }
}

/**
 * Resolve an event to one of our users, or null for a no-op.
 *
 * The stored customer id is checked first because our DB is the source of
 * truth for that mapping. Metadata is a fallback for the narrow case where
 * checkout succeeded but persisting the customer id did not — and it is
 * verified against the DB, since metadata may have been written by another
 * environment sharing this Stripe account.
 */
async function resolveUserId(
  customerId: string | null,
  metadataUserId: string | undefined
): Promise<string | null> {
  if (customerId) {
    const user = await findUserByStripeCustomerId(customerId)
    if (user) return user.id
  }
  if (metadataUserId && (await userExists(metadataUserId))) return metadataUserId
  return null
}

/** The customer field is either an id or an expanded object; we only want the id. */
function customerId(customer: string | { id: string } | null): string | null {
  if (!customer) return null
  return typeof customer === "string" ? customer : customer.id
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set")
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    const rawBody = await req.text()
    // `constructEventAsync` works with both the sync (Node) and async
    // (SubtleCrypto) providers — safe if this ever moves off the Node runtime.
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, secret)
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        if (session.mode !== "subscription") break

        const userId = await resolveUserId(
          customerId(session.customer),
          session.metadata?.userId ?? session.client_reference_id ?? undefined
        )
        if (!userId) break

        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription?.id ?? null)
        if (!subId) break

        const sub = await stripe.subscriptions.retrieve(subId)
        await syncSubscription(userId, subscriptionSync(sub))
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object
        const userId = await resolveUserId(customerId(sub.customer), sub.metadata?.userId)
        if (!userId) break
        await syncSubscription(userId, subscriptionSync(sub))
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object
        const userId = await resolveUserId(customerId(sub.customer), sub.metadata?.userId)
        if (!userId) break
        await syncSubscription(userId, {
          isPro: false,
          stripeSubscriptionId: null,
          stripeSubscriptionStatus: sub.status,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
        })
        break
      }

      default:
        // Unhandled event types are fine — acknowledge so Stripe stops retrying.
        break
    }
  } catch (err) {
    // Return 500 so Stripe retries with backoff. Every handler writes absolute
    // state rather than deltas, so a replay lands on the same result.
    console.error(`Stripe webhook handler failed for ${event.type}`, err)
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}