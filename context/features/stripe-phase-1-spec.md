# Stripe Phase 1 - Core Infrastructure

## Overview

Scaffold the billing foundation for DevStash Pro ($8/mo, $72/yr) — schema, plan-limit logic, Stripe client, billing queries, session plumbing, and the checkout/portal server actions. **Nothing is enforced and nothing is user-visible in this phase.** Everything here is verifiable with `npm run test` and `npm run build` alone; no Stripe CLI required.

Full reference plan with worked code for every file: @docs/stripe-integration-plan.md

## Requirements

- Install `stripe` (v22.x — pins API version `2026-07-29.dahlia` itself)
- Add three columns to `User` via a migration: `stripeSubscriptionStatus`, `stripePriceId`, `stripeCurrentPeriodEnd` (`isPro`, `stripeCustomerId`, `stripeSubscriptionId` already exist)
- Create a **pure** `usage-limits` module holding the Free-plan limits (50 items, 3 collections, no uploads) and the enforcement kill-switch — no DB, no Stripe imports, fully unit tested
- Create a lazy, memoized Stripe client that never throws on import when env is absent
- Create owner-scoped billing queries (`getBillingStatus`, `getPlanUsage`, `setStripeCustomerId`, `findUserByStripeCustomerId`, `syncSubscription`)
- Sync `isPro` from the DB into the JWT on **every** session validation, and expose it as `session.user.isPro`
- Create `createCheckoutSession` and `createBillingPortalSession` server actions returning `{ success, data, error }`
- Set up the Stripe test-mode product, two prices, and customer portal
- Unit tests for the usage-limits module, the billing queries, and the billing actions

## Files to Create

1. `src/lib/usage-limits.ts` - Pure plan/limit logic. `FREE_ITEM_LIMIT = 50`, `FREE_COLLECTION_LIMIT = 3`, `billingEnforced()`, `getPlanLimits(isPro)`, `itemLimitError()`, `collectionLimitError()`, `uploadNotAllowedError()`
2. `src/lib/usage-limits.test.ts` - **Required by this phase.** See Testing below
3. `src/lib/stripe.ts` - Lazy memoized `getStripe()`, plus `PRICE_IDS`, `isProStatus()`, `baseUrl()`
4. `src/lib/db/billing.ts` - Billing reads/writes, all taking `userId` first
5. `src/lib/db/billing.test.ts` - Query scoping, `select` shape, sync write args
6. `src/actions/billing.ts` - `createCheckoutSession(interval)`, `createBillingPortalSession()`
7. `src/actions/billing.test.ts` - Action guards and Stripe call params (Stripe mocked)

## Files to Modify

1. `prisma/schema.prisma` - Three new `User` columns (see plan §4.9)
2. `src/auth.ts` - Add `isPro` to the **existing** `jwt` callback query; set `session.user.isPro` in the `session` callback
3. `src/types/next-auth.d.ts` - Add `isPro: boolean` to `Session["user"]`, and augment `next-auth/jwt`'s `JWT` with `isPro?: boolean`
4. `.env.example` - Add `BILLING_ENFORCED=false` (the five `STRIPE_*` vars are already there)

## Naming Note

The reference plan calls the limits module `src/lib/billing.ts`. **This spec splits it:** pure limit logic goes in `src/lib/usage-limits.ts` (no Stripe import, trivially testable), while Stripe-specific config (`PRICE_IDS`, `isProStatus`, `baseUrl`) sits with the client in `src/lib/stripe.ts`. Where the plan says `@/lib/billing` for a limit helper, read `@/lib/usage-limits`.

## Key Gotchas

Use Context7 to verify current Stripe SDK conventions before writing code.

- **Do not pass `apiVersion`** to `new Stripe()`. stripe-node pins its own version and the TS types match that pin; a mismatched string is a type error
- **`billingEnforced` must be a function, not a `const`.** A module-load `const` can't be re-read after `vi.stubEnv`, forcing `resetModules` + dynamic import in every test. A function costs nothing and keeps tests plain
- **`BILLING_ENFORCED` defaults to `false`** — note this is the *inverse* of `EMAIL_VERIFICATION_ENABLED`, which defaults true. Read it as `process.env.BILLING_ENFORCED === "true"`. Per project-overview.md, everything stays unlocked during development
- **The `jwt` callback already queries the user** for `passwordChangedAt`. Add `isPro` to that existing `select` — do not add a second query
- **Do not drop the `passwordChangedAt` check** while restructuring the callback. It powers sign-out-everywhere-on-password-change. The check must stay skipped on the sign-in pass (`user` present), where there's no prior `iat` to compare
- **The proxy will never see `isPro`.** `src/proxy.ts` builds `NextAuth(authConfig)` from the edge-safe `auth.config.ts`, which has no callbacks. Gate in server components and actions only — never in the proxy
- **Actions return the URL; they must not call `redirect()`.** `redirect()` throws internally and would be swallowed by the `try/catch` convention. The client does `window.location.href = url`
- **Pass `idempotencyKey: "customer:${userId}"`** when creating a Stripe customer. `stripeCustomerId` is `@unique`, so a double-click could otherwise hit a constraint violation
- Set `client_reference_id`, `metadata.userId`, **and** `subscription_data.metadata.userId` on the checkout session — Phase 2's webhook needs redundant ways to resolve the user
- **Migration policy:** `npm run db:migrate` (`prisma migrate dev`), never `db push`. Neon **development** branch (`br-plain-smoke-ald1szfh`) only. Then run `prisma generate` explicitly — `migrate dev` has previously left a stale client and broken the build's type-check

## Environment Variables

Already documented in `.env.example`; populate `.env.local` from the Stripe test-mode dashboard:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
BILLING_ENFORCED=false
```

`STRIPE_WEBHOOK_SECRET` is Phase 2. `STRIPE_PUBLISHABLE_KEY` is unused — hosted Checkout and the hosted portal need no client-side Stripe.js.

## Stripe Dashboard Setup (test mode)

1. Product `DevStash Pro`
2. Two recurring prices: **$8.00/month** and **$72.00/year**. The homepage "$6/mo" is presentation only (`$72 ÷ 12`) — do **not** create a $6/month price
3. Customer portal: enable cancel, update payment method, invoice history, and *switch plans* with both prices attached
4. Portal default return URL → `<domain>/settings`

## Testing

Unit tests only — no browser flow exists yet. Per coding-standards.md, scope is server actions + `src/lib` utilities; mock at the module boundary.

**`usage-limits.test.ts`** (the required deliverable):

- `getPlanLimits` — Pro returns unlimited; Free under enforcement returns `50 / 3 / uploads:false`; Free with `BILLING_ENFORCED` off returns unlimited
- `itemLimitError` — 49 → `null` (allowed), 50 → message (blocked), 51 → message. Boundary matters
- `collectionLimitError` — 2 → `null`, 3 → message
- `uploadNotAllowedError` — Free → message, Pro → `null`, enforcement off → `null`
- Every error message mentions the limit and Pro, since it surfaces directly as a Sonner toast

**`db/billing.test.ts`** — user-scoping, `select` shape, `syncSubscription` write args, `findUserByStripeCustomerId` null on unknown customer.

**`actions/billing.test.ts`** — auth guard, invalid interval, unconfigured price env, already-Pro rejection, customer reuse vs. creation, checkout params include all three user references, throw → generic error; portal rejects cleanly with no `stripeCustomerId`.

Mock Stripe — never hit the real API:

```ts
vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
  })),
  PRICE_IDS: { monthly: "price_m", yearly: "price_y" },
  baseUrl: () => "http://localhost:3000",
}))
```

**Manual verification** (the only browser check in this phase): sign in and confirm the sidebar `FREE` badge and "Upgrade to Pro" CTA still render correctly — they now read through the modified session path. Also change your password and confirm you're still signed out everywhere (the `passwordChangedAt` regression check).

`npm run test` and `npm run build` must both pass before committing.

## Out of Scope (Phase 2)

Webhook route, all feature gating, `BillingSection` UI, settings page wiring, sidebar CTA link, dashboard stats copy, Stripe CLI end-to-end testing.

## Open Questions

- **Trial or no trial?** The homepage Pro CTA reads "Start Pro Trial" but nothing configures one. Either add `subscription_data.trial_period_days` or change the copy — shipping a "trial" button that charges immediately is a refund risk
- **`past_due` behaviour** — revoke Pro immediately or keep access through Smart Retries? Decide before Phase 2's webhook, since it determines which event downgrades

## References

- Reference plan: @docs/stripe-integration-plan.md (§3.1–3.4, §4.1–4.2, §4.9–4.10, §5, §6)
- Stripe Node SDK: https://github.com/stripe/stripe-node
- Checkout Sessions: https://docs.stripe.com/api/checkout/sessions/create
- Customer portal: https://docs.stripe.com/customer-management
