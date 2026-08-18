import { describe, expect, it } from "vitest"
import { PLAN_PRICING } from "@/lib/plan-pricing"

describe("PLAN_PRICING", () => {
  it("covers both billing intervals", () => {
    expect(Object.keys(PLAN_PRICING).sort()).toEqual(["monthly", "yearly"])
  })

  it("matches the configured Stripe amounts", () => {
    expect(PLAN_PRICING.monthly.amount).toBe("$8 AUD")
    expect(PLAN_PRICING.yearly.amount).toBe("$72 AUD")
  })

  it("labels the currency on every amount", () => {
    // Checkout charges AUD; a bare "$8" would misrepresent the price to a user
    // reading it as USD, so the label is part of the contract, not decoration.
    for (const price of Object.values(PLAN_PRICING)) {
      expect(price.amount).toMatch(/AUD/)
    }
  })

  it("only advertises savings on the yearly price", () => {
    expect(PLAN_PRICING.monthly.note).toBeUndefined()
    expect(PLAN_PRICING.yearly.note).toMatch(/Save/)
  })
})
