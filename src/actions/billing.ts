"use server"

import { z } from "zod"
import { auth } from "@/auth"
import { PRICE_IDS, baseUrl, getStripe } from "@/lib/stripe"
import type { BillingInterval } from "@/lib/stripe"
import { getBillingStatus, setStripeCustomerId } from "@/lib/db/billing"

/**
 * Both actions deliberately **return** the Stripe-hosted URL rather than
 * calling `redirect()`. `redirect()` works by throwing, which the project's
 * try/catch action convention would swallow into the generic error branch.
 * The client navigates with `window.location.href = url`.
 */
export type BillingSessionResult =
  | { success: true; data: { url: string } }
  | { success: false; error: string }

const checkoutSchema = z.object({
  interval: z.enum(["monthly", "yearly"]),
})

export async function createCheckoutSession(
  interval: BillingInterval
): Promise<BillingSessionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  const parsed = checkoutSchema.safeParse({ interval })
  if (!parsed.success) {
    return { success: false, error: "Invalid billing interval" }
  }

  const priceId = PRICE_IDS[parsed.data.interval]
  if (!priceId) {
    return { success: false, error: "Billing is not configured." }
  }

  const userId = session.user.id

  try {
    const status = await getBillingStatus(userId)
    if (!status) return { success: false, error: "Account not found" }
    if (status.isPro) return { success: false, error: "You're already on Pro." }

    const stripe = getStripe()

    // Reuse the stored customer, or create one. The idempotency key guards the
    // `stripeCustomerId @unique` column against a double-click creating two
    // customers for the same user.
    let customerId = status.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: session.user.email ?? undefined,
          metadata: { userId },
        },
        { idempotencyKey: `customer:${userId}` }
      )
      customerId = customer.id
      await setStripeCustomerId(userId, customerId)
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Belt and braces: three independent ways for Phase 2's webhook to
      // resolve the user from an event.
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
      allow_promotion_codes: true,
      success_url: `${baseUrl()}/settings?checkout=success`,
      cancel_url: `${baseUrl()}/settings?checkout=cancelled`,
    })

    if (!checkout.url) {
      return { success: false, error: "Could not start checkout." }
    }
    return { success: true, data: { url: checkout.url } }
  } catch {
    return { success: false, error: "Something went wrong. Please try again." }
  }
}

/** Open the Stripe-hosted customer portal (manage / cancel / update card). */
export async function createBillingPortalSession(): Promise<BillingSessionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const status = await getBillingStatus(session.user.id)
    if (!status?.stripeCustomerId) {
      return { success: false, error: "No billing account found." }
    }

    const portal = await getStripe().billingPortal.sessions.create({
      customer: status.stripeCustomerId,
      return_url: `${baseUrl()}/settings`,
    })

    return { success: true, data: { url: portal.url } }
  } catch {
    return { success: false, error: "Something went wrong. Please try again." }
  }
}
