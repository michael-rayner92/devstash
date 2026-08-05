import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  findUserByStripeCustomerId,
  getBillingStatus,
  getPlanUsage,
  setStripeCustomerId,
  syncSubscription,
  userExists,
} from "@/lib/db/billing"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    item: { count: vi.fn() },
    collection: { count: vi.fn() },
  },
}))

// Prisma's generated method types are complex overloaded generics that don't
// play well with vi.mocked(); narrow to the shape these tests actually need.
const mockedPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  item: { count: ReturnType<typeof vi.fn> }
  collection: { count: ReturnType<typeof vi.fn> }
}

const STRIPE_COLUMNS = {
  isPro: true,
  stripeCustomerId: "cus_123",
  stripeSubscriptionId: "sub_123",
  stripeSubscriptionStatus: "active",
  stripePriceId: "price_m",
  stripeCurrentPeriodEnd: new Date("2026-09-01T00:00:00.000Z"),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getBillingStatus", () => {
  it("scopes every query to the user and selects only the billing columns", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(STRIPE_COLUMNS)
    mockedPrisma.item.count.mockResolvedValue(18)
    mockedPrisma.collection.count.mockResolvedValue(5)

    await getBillingStatus("user-1")

    expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        isPro: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeSubscriptionStatus: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
      },
    })
    expect(mockedPrisma.item.count).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(mockedPrisma.collection.count).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    })
  })

  it("serializes stripeCurrentPeriodEnd to an ISO string and attaches usage counts", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(STRIPE_COLUMNS)
    mockedPrisma.item.count.mockResolvedValue(18)
    mockedPrisma.collection.count.mockResolvedValue(5)

    expect(await getBillingStatus("user-1")).toEqual({
      isPro: true,
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      stripeSubscriptionStatus: "active",
      stripePriceId: "price_m",
      stripeCurrentPeriodEnd: "2026-09-01T00:00:00.000Z",
      itemCount: 18,
      collectionCount: 5,
    })
  })

  it("keeps a null period end as null rather than an invalid date string", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      ...STRIPE_COLUMNS,
      isPro: false,
      stripeCurrentPeriodEnd: null,
    })
    mockedPrisma.item.count.mockResolvedValue(0)
    mockedPrisma.collection.count.mockResolvedValue(0)

    const status = await getBillingStatus("user-1")

    expect(status?.stripeCurrentPeriodEnd).toBeNull()
  })

  it("returns null when the user does not exist", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null)
    mockedPrisma.item.count.mockResolvedValue(0)
    mockedPrisma.collection.count.mockResolvedValue(0)

    expect(await getBillingStatus("missing")).toBeNull()
  })
})

describe("getPlanUsage", () => {
  it("scopes to the user and selects only isPro", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ isPro: false })
    mockedPrisma.item.count.mockResolvedValue(49)
    mockedPrisma.collection.count.mockResolvedValue(2)

    expect(await getPlanUsage("user-1")).toEqual({
      isPro: false,
      itemCount: 49,
      collectionCount: 2,
    })
    expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { isPro: true },
    })
  })

  it("returns null when the user does not exist", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null)
    mockedPrisma.item.count.mockResolvedValue(0)
    mockedPrisma.collection.count.mockResolvedValue(0)

    expect(await getPlanUsage("missing")).toBeNull()
  })
})

describe("setStripeCustomerId", () => {
  it("writes the customer id scoped to the user", async () => {
    mockedPrisma.user.update.mockResolvedValue({})

    await setStripeCustomerId("user-1", "cus_new")

    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { stripeCustomerId: "cus_new" },
    })
  })
})

describe("findUserByStripeCustomerId", () => {
  it("looks up by customer id and selects only the id", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ id: "user-1" })

    expect(await findUserByStripeCustomerId("cus_123")).toEqual({ id: "user-1" })
    expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_123" },
      select: { id: true },
    })
  })

  it("returns null for an unknown customer (e.g. another environment)", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null)

    expect(await findUserByStripeCustomerId("cus_unknown")).toBeNull()
  })
})

describe("userExists", () => {
  it("returns true and selects only the id", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ id: "user-1" })

    expect(await userExists("user-1")).toBe(true)
    expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true },
    })
  })

  it("returns false for a userId that isn't ours (stale Stripe metadata)", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null)

    expect(await userExists("user-from-another-env")).toBe(false)
  })
})

describe("syncSubscription", () => {
  it("writes the full subscription state scoped to the user", async () => {
    mockedPrisma.user.update.mockResolvedValue({})
    const periodEnd = new Date("2026-09-01T00:00:00.000Z")

    await syncSubscription("user-1", {
      isPro: true,
      stripeSubscriptionId: "sub_123",
      stripeSubscriptionStatus: "active",
      stripePriceId: "price_m",
      stripeCurrentPeriodEnd: periodEnd,
    })

    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        isPro: true,
        stripeSubscriptionId: "sub_123",
        stripeSubscriptionStatus: "active",
        stripePriceId: "price_m",
        stripeCurrentPeriodEnd: periodEnd,
      },
    })
  })

  it("writes the cleared state on downgrade (all nulls, isPro false)", async () => {
    mockedPrisma.user.update.mockResolvedValue({})

    await syncSubscription("user-1", {
      isPro: false,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: "canceled",
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
    })

    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        isPro: false,
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: "canceled",
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
      },
    })
  })
})
