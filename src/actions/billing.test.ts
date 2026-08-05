import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import {
  createBillingPortalSession,
  createCheckoutSession,
} from "@/actions/billing"
import { auth } from "@/auth"
import { getBillingStatus, setStripeCustomerId } from "@/lib/db/billing"
import type { BillingStatus } from "@/lib/db/billing"
import type { BillingInterval } from "@/lib/stripe"

/**
 * Stripe is mocked at the module boundary — these tests never touch the real
 * API. `vi.hoisted` gives a stable mock object the assertions can inspect
 * (a factory returning fresh `vi.fn()`s each call would not be assertable),
 * and a mutable PRICE_IDS so the unconfigured-price path is reachable.
 */
const mocks = vi.hoisted(() => ({
  stripe: {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
  },
  priceIds: {
    monthly: "price_m" as string | undefined,
    yearly: "price_y" as string | undefined,
  },
}))

vi.mock("@/lib/stripe", () => ({
  getStripe: () => mocks.stripe,
  PRICE_IDS: mocks.priceIds,
  baseUrl: () => "http://localhost:3000",
}))

vi.mock("@/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/db/billing", () => ({
  getBillingStatus: vi.fn(),
  setStripeCustomerId: vi.fn(),
}))

const SESSION: Session = {
  user: { id: "user-1", email: "demo@devstash.io", isPro: false },
  expires: "2099-01-01T00:00:00.000Z",
}

const FREE_STATUS: BillingStatus = {
  isPro: false,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  stripeSubscriptionStatus: null,
  stripePriceId: null,
  stripeCurrentPeriodEnd: null,
  itemCount: 18,
  collectionCount: 5,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.priceIds.monthly = "price_m"
  mocks.priceIds.yearly = "price_y"
})

describe("createCheckoutSession", () => {
  it("rejects when there is no session", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    expect(await createCheckoutSession("monthly")).toEqual({
      success: false,
      error: "Not authenticated",
    })
    expect(getBillingStatus).not.toHaveBeenCalled()
    expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it("rejects an interval outside monthly/yearly", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)

    expect(await createCheckoutSession("weekly" as BillingInterval)).toEqual({
      success: false,
      error: "Invalid billing interval",
    })
    expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it("rejects when the price for that interval is not configured", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    mocks.priceIds.yearly = undefined

    expect(await createCheckoutSession("yearly")).toEqual({
      success: false,
      error: "Billing is not configured.",
    })
    expect(getBillingStatus).not.toHaveBeenCalled()
  })

  it("rejects when the account cannot be found", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(getBillingStatus).mockResolvedValue(null)

    expect(await createCheckoutSession("monthly")).toEqual({
      success: false,
      error: "Account not found",
    })
    expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it("rejects a user who is already on Pro", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(getBillingStatus).mockResolvedValue({
      ...FREE_STATUS,
      isPro: true,
      stripeCustomerId: "cus_123",
    })

    expect(await createCheckoutSession("monthly")).toEqual({
      success: false,
      error: "You're already on Pro.",
    })
    expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it("creates a Stripe customer (with an idempotency key) and stores its id", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(getBillingStatus).mockResolvedValue(FREE_STATUS)
    mocks.stripe.customers.create.mockResolvedValue({ id: "cus_new" })
    mocks.stripe.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/new",
    })

    await createCheckoutSession("monthly")

    expect(mocks.stripe.customers.create).toHaveBeenCalledWith(
      { email: "demo@devstash.io", metadata: { userId: "user-1" } },
      { idempotencyKey: "customer:user-1" }
    )
    expect(setStripeCustomerId).toHaveBeenCalledWith("user-1", "cus_new")
    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_new" })
    )
  })

  it("reuses an existing customer instead of creating a second one", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(getBillingStatus).mockResolvedValue({
      ...FREE_STATUS,
      stripeCustomerId: "cus_existing",
    })
    mocks.stripe.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/existing",
    })

    await createCheckoutSession("monthly")

    expect(mocks.stripe.customers.create).not.toHaveBeenCalled()
    expect(setStripeCustomerId).not.toHaveBeenCalled()
    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" })
    )
  })

  it("sets all three user references the webhook can resolve from", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(getBillingStatus).mockResolvedValue({
      ...FREE_STATUS,
      stripeCustomerId: "cus_existing",
    })
    mocks.stripe.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/refs",
    })

    await createCheckoutSession("monthly")

    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: "user-1",
        metadata: { userId: "user-1" },
        subscription_data: { metadata: { userId: "user-1" } },
      })
    )
  })

  it("passes the price for the requested interval, in subscription mode", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(getBillingStatus).mockResolvedValue({
      ...FREE_STATUS,
      stripeCustomerId: "cus_existing",
    })
    mocks.stripe.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/yearly",
    })

    const result = await createCheckoutSession("yearly")

    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        line_items: [{ price: "price_y", quantity: 1 }],
        success_url: "http://localhost:3000/settings?checkout=success",
        cancel_url: "http://localhost:3000/settings?checkout=cancelled",
      })
    )
    expect(result).toEqual({
      success: true,
      data: { url: "https://checkout.stripe.com/c/pay/yearly" },
    })
  })

  it("does not configure a trial (checkout charges immediately)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(getBillingStatus).mockResolvedValue({
      ...FREE_STATUS,
      stripeCustomerId: "cus_existing",
    })
    mocks.stripe.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/no-trial",
    })

    await createCheckoutSession("monthly")

    const params = mocks.stripe.checkout.sessions.create.mock.calls[0][0]
    expect(params.subscription_data).not.toHaveProperty("trial_period_days")
  })

  it("errors when Stripe returns a session with no URL", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(getBillingStatus).mockResolvedValue({
      ...FREE_STATUS,
      stripeCustomerId: "cus_existing",
    })
    mocks.stripe.checkout.sessions.create.mockResolvedValue({ url: null })

    expect(await createCheckoutSession("monthly")).toEqual({
      success: false,
      error: "Could not start checkout.",
    })
  })

  it("returns a generic error when Stripe throws", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(getBillingStatus).mockResolvedValue({
      ...FREE_STATUS,
      stripeCustomerId: "cus_existing",
    })
    mocks.stripe.checkout.sessions.create.mockRejectedValue(new Error("card_error"))

    expect(await createCheckoutSession("monthly")).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    })
  })
})

describe("createBillingPortalSession", () => {
  it("rejects when there is no session", async () => {
    vi.mocked(auth).mockResolvedValue(null)

    expect(await createBillingPortalSession()).toEqual({
      success: false,
      error: "Not authenticated",
    })
    expect(mocks.stripe.billingPortal.sessions.create).not.toHaveBeenCalled()
  })

  it("rejects cleanly for a user with no Stripe customer", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(getBillingStatus).mockResolvedValue(FREE_STATUS)

    expect(await createBillingPortalSession()).toEqual({
      success: false,
      error: "No billing account found.",
    })
    expect(mocks.stripe.billingPortal.sessions.create).not.toHaveBeenCalled()
  })

  it("rejects cleanly when the account cannot be found", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(getBillingStatus).mockResolvedValue(null)

    expect(await createBillingPortalSession()).toEqual({
      success: false,
      error: "No billing account found.",
    })
  })

  it("opens the portal for the stored customer and returns to /settings", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(getBillingStatus).mockResolvedValue({
      ...FREE_STATUS,
      isPro: true,
      stripeCustomerId: "cus_123",
    })
    mocks.stripe.billingPortal.sessions.create.mockResolvedValue({
      url: "https://billing.stripe.com/p/session/123",
    })

    expect(await createBillingPortalSession()).toEqual({
      success: true,
      data: { url: "https://billing.stripe.com/p/session/123" },
    })
    expect(mocks.stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "http://localhost:3000/settings",
    })
  })

  it("returns a generic error when Stripe throws", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION)
    vi.mocked(getBillingStatus).mockResolvedValue({
      ...FREE_STATUS,
      isPro: true,
      stripeCustomerId: "cus_123",
    })
    mocks.stripe.billingPortal.sessions.create.mockRejectedValue(new Error("api down"))

    expect(await createBillingPortalSession()).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    })
  })
})
