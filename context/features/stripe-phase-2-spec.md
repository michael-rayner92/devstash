# Stripe Phase 2 - Integration & UI

## Overview

Wire Phase 1's infrastructure into a working subscription flow: the webhook that flips `isPro`, enforcement at all three create paths, and the billing UI on `/settings`. This is the phase that requires the **Stripe CLI** for local testing — the webhook cannot be verified without it.

Depends on **Phase 1 being merged**: @context/features/stripe-phase-1-spec.md
Full reference plan with worked code: @docs/stripe-integration-plan.md

## Requirements

- Webhook route handling `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Signature verification as the only auth — reject unsigned/tampered requests with 400
- Enforce Free-plan limits at **all three** create paths (see Gotchas — one is easy to miss)
- `BillingSection` client component: usage meters + monthly/yearly toggle + Upgrade for Free users; renewal date + Manage subscription for Pro users
- Mount it as the first card on `/settings`, with `?checkout=success` / `?checkout=cancelled` toasts
- Make the sidebar "Upgrade to Pro" block an actual link
- Make the dashboard stats cards plan-aware instead of hard-coded Free copy
- **Fix the homepage "Start Pro Trial" copy** — Phase 1 shipped no trial, so this label currently promises one that doesn't exist (see Files to Modify #7)
- Full end-to-end verification with `stripe listen`, at `BILLING_ENFORCED` both off and on
- **Resurface the deferred questions** at the end (see Open Questions) — none block implementation, but they should be answered rather than silently inherited

## Naming Note

Carried forward from Phase 1, which split the reference plan's `src/lib/billing.ts` in two:

| Plan says | Actually import from |
|---|---|
| `@/lib/billing` for `itemLimitError`, `collectionLimitError`, `uploadNotAllowedError`, `getPlanLimits`, `billingEnforced` | **`@/lib/usage-limits`** |
| `@/lib/billing` for `isProStatus`, `PRICE_IDS`, `baseUrl` | **`@/lib/stripe`** |

This matters because §4.3, §4.4 and §4.5 of the plan — the three gate sites this phase implements — all show `import … from "@/lib/billing"`, which does not resolve. There is no `src/lib/billing.ts`; `src/lib/db/billing.ts` (the queries) is a different module.

Also note `billingEnforced` is a **function**, not a const: call it as `billingEnforced()`.

## Decisions Carried From Phase 1

Settled during Phase 1 — do not re-litigate, just implement:

- **No trial.** Checkout charges immediately; `createCheckoutSession` passes no `trial_period_days`. This is why the homepage copy fix is in scope here
- **`past_due` revokes Pro immediately.** `isProStatus()` grants only `active` and `trialing`, so a `customer.subscription.updated` carrying `past_due` downgrades through the ordinary `updated` handler — no special case needed
- **Prices are AUD**, not USD: `8.00 AUD/month` and `72.00 AUD/year` on `prod_V12tZGzbuydXaC`. Checkout will show AUD; the homepage's bare `$` is consistent with this
- **The customer portal is already configured** — `bpc_1U13f3GhY8WlH9zlrkUejph5` (default, active), created via the API in Phase 1: cancel `at_period_end`, payment method update, invoice history, customer update, and switch-plans with **both** prices attached. `default_return_url` is `http://localhost:3000/settings`. The Lifecycle tests below depend on this, so no dashboard setup is needed first

## Files to Create

1. `src/app/api/stripe/webhook/route.ts` - Webhook receiver. `export const runtime = "nodejs"`
2. `src/components/settings/billing-section.tsx` - Client component (`"use client"`), `useTransition` + Sonner

## Files to Modify

1. `src/actions/items.ts` - Item limit gate in `createItem`, after Zod validation, before the query
2. `src/actions/collections.ts` - Collection limit gate in `createCollection`
3. `src/app/api/upload/route.ts` - **Both** the Pro-uploads gate and the item limit gate, placed before `uploadToR2`
4. `src/app/settings/page.tsx` - Add `getBillingStatus` to the existing `Promise.all`; add the billing section with `id="billing"` and `scroll-mt`; handle the checkout query params
5. `src/components/dashboard/sidebar-content.tsx` - Wrap the inert upgrade `<div>` (lines ~146-154) in `<Link href="/settings#billing">`
6. `src/app/dashboard/page.tsx` - Replace hard-coded `sub="50 on free plan"` / `"3 on free plan"` / `"upgrade to unlock"` (lines 53, 58, 68) with values from `getPlanLimits(dbUser.isPro)`. `dbUser` already carries `isPro` — no extra query
7. `src/components/home/data.ts` - **`PRO_PLAN.cta.label` (line 156): `"Start Pro Trial"` → `"Upgrade to Pro"`.** Phase 1 deliberately shipped no trial, so this button currently advertises one and then charges $8 immediately — a refund/chargeback risk, and the only place on the homepage that says "trial" (grep confirms one occurrence). A one-line change; do not skip it as cosmetic
8. `src/actions/items.test.ts` - Extend: create blocked at limit, allowed for Pro, allowed when unenforced
9. `src/actions/collections.test.ts` - Extend: same three cases at the 3-collection limit
10. `.env.example` / `.env.local` - `STRIPE_WEBHOOK_SECRET` (from `stripe listen`, not the dashboard, for local dev). Already present but empty in `.env.example`

## Key Gotchas

- **`current_period_end` is NOT on the Subscription object.** It moved to the subscription **item** (`sub.items.data[0].current_period_end`) as of API `2025-10-29.clover`. Reading `sub.current_period_end` is the single most common way this integration silently stores `null` forever — and it fails quietly, since the column is nullable
- **The `/api/upload` route is the easy-to-miss gate.** File/image items are created there via `createFileItem`, **not** through the `createItem` action (whose `CREATABLE_TYPE_NAMES` deliberately excludes file/image). Gate only the action and a Free user can both exceed 50 items and upload files at all. Three create paths, not two
- **Check the plan before uploading to R2**, not after — a rejected upload must not leave an orphaned object in the bucket
- **Use `constructEventAsync`**, and read the raw body with `await req.text()`. Do not parse the body any other way first, or verification fails. No `bodyParser: false` equivalent is needed in App Router
- **The webhook must not call `auth()`.** It's unauthenticated by design — the `stripe-signature` header is the auth. The proxy matcher already excludes `/api`
- **Return 500 on handler failure** so Stripe retries with backoff; return 200 for unhandled event types so it stops. All handlers write absolute state, not deltas, so redelivery is safe
- **Resolve unknown customers to a no-op, not an error.** A webhook for a `customer` id we don't recognise (e.g. another environment sharing the Stripe account) should return 200 and write nothing
- **`isPro` must only ever be written by the webhook.** No client input, no action, no form should be able to set it. Grep to confirm before finishing
- **Local `STRIPE_WEBHOOK_SECRET` differs from the dashboard endpoint's secret.** `stripe listen` prints its own `whsec_…` per session
- Radix/portal note if the billing section grows a dropdown or dialog: use `modal={false}` on a `DropdownMenu` that opens a `Dialog`, per the known pointer-events race already hit in `collection-card-menu.tsx`

## Testing

### Prerequisites

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Put the printed `whsec_…` in `.env.local`.

### Automated

- Extended `items.test.ts` / `collections.test.ts` — blocked at limit, allowed for Pro, allowed when unenforced
- `npm run test` and `npm run build` both green

The webhook route and `BillingSection` get no unit tests — route handlers and components are outside the coding-standards test scope. They're verified manually below.

### Happy path

1. Free user at `/settings` → sees Free plan, item and collection usage counts
2. Upgrade (monthly) → Stripe Checkout showing **$8.00 AUD/month** (see Decisions Carried From Phase 1 — the currency is AUD, not USD)
3. Pay with `4242 4242 4242 4242`, any future expiry, any CVC
4. Redirects to `/settings?checkout=success` with a success toast
5. CLI shows `checkout.session.completed` → `200`
6. DB: `isPro=true`, customer + subscription ids set, status `active`, and **`stripeCurrentPeriodEnd` not null** — this is where the gotcha above surfaces
7. **Reload** → sidebar badge flips `FREE` → `PRO`, upgrade CTA disappears (proves Phase 1's JWT sync works)
8. Yearly checkout charges **$72.00 AUD/year**
9. Homepage `/#pricing` no longer says "Start Pro Trial" (Files to Modify #7)

### Gating (set `BILLING_ENFORCED=true`)

- Free user at 50 items → create rejected with the limit toast
- Free user at 3 collections → create rejected with the limit toast
- Free user file upload → 403 with the Pro message, **and no orphan object in R2**
- Pro user → all three succeed
- Back at `BILLING_ENFORCED=false` → all three succeed for a Free user

> ⚠️ **Both existing users already have 5 collections** against the Free limit of 3 (verified on the Neon dev branch, 2026-08-05). Flipping enforcement on immediately walls off collection creation for both. Nothing is deleted, but plan your manual testing around it — upgrade the test account first, or test the limit with a fresh user.

### Lifecycle

- Portal → cancel → `customer.subscription.updated` with `cancel_at_period_end` → still Pro until period end
- `stripe trigger customer.subscription.deleted` → `isPro=false`, subscription id cleared
- Portal → switch monthly → yearly → `stripePriceId` updates. **Also note the proration line on the resulting invoice** and check it against Open Question 1
- Failed payment `4000 0000 0000 0341` → status becomes `past_due` and **`isPro` flips to `false` on that same `updated` event** — per Phase 1's decision, a failed payment revokes access immediately rather than surviving Smart Retries. No special-case code: `isProStatus("past_due")` is already `false`
- Replay an event from the CLI → identical DB state, no error (idempotency)

### Security

- `POST /api/stripe/webhook` with no `stripe-signature` → 400
- Tampered body or signature → 400, **no DB write**
- Webhook for an unknown customer id → 200, no write
- `createCheckoutSession` while signed out → `"Not authenticated"`
- `createBillingPortalSession` with no `stripeCustomerId` → clean error, no crash
- Grep confirms `isPro` is written only by the webhook

## Out of Scope

- Homepage pricing CTAs going straight to **checkout** for signed-in users (optional polish, plan §4.11). ⚠️ This excludes only the *CTA-to-checkout routing*, **not** the "Start Pro Trial" copy fix from that same plan section — the copy fix **is** in scope (Files to Modify #7). Both are documented in §4.11, so read that section carefully rather than skipping it wholesale
- AI features, custom item types, and data export — the `isPro` plumbing exists for them, but none are built
- Any production-mode Stripe configuration; test mode only

## Open Questions

None of these block implementation. Answer them during the phase where they naturally come up, and **raise any still-unanswered ones when reporting the phase complete** rather than letting them carry silently into launch.

1. **Proration on plan switches.** Phase 1's portal configuration was created with `proration_behavior: "create_prorations"` (Stripe's own portal default), so a monthly → yearly switch credits the unused monthly remainder. This was an implementation default, not a product decision. Confirm it, or change it to `"none"` — a one-line update to `bpc_1U13f3GhY8WlH9zlrkUejph5`. The Lifecycle section above is where you'll first see it behave
2. **`STRIPE_PUBLISHABLE_KEY` is unused.** Hosted Checkout and the hosted portal need no client-side Stripe.js, so nothing in either phase reads it. Keep it in `.env.example` as a placeholder for a future Elements flow, or remove it? (plan §9 Q4)
3. **`getPlanUsage` cost.** This phase is what makes it real: it adds two `count` queries to every item create, every collection create, and every upload. Fine at current scale (~20 items per user) and deliberately uncached. Worth revisiting only if item counts grow large (plan §9 Q6)
4. **Should the dashboard usage copy warn as it approaches a limit?** Making the stats cards plan-aware (Files to Modify #6) puts real limits on screen for the first time. A Free user at 48/50 items sees no signal until the create fails. Out of scope as written — flag if wanted
5. **`vi.mocked(auth)` type noise.** Extending `items.test.ts` / `collections.test.ts` will add more of the pre-existing `Argument of type 'Session' is not assignable to parameter of type 'NextMiddleware'` errors under bare `tsc --noEmit` (NextAuth v5's `auth` is overloaded). Harmless — `npm run build` is the project's gate and does not see them — but if the count is ever to be driven to zero, a shared typed `mockAuth()` helper is the fix, and this is the phase where the pattern spreads furthest

## References

- Reference plan: @docs/stripe-integration-plan.md (§3.5–3.6, §4.3–4.8, **§4.11** for the copy fix, §6, §7, §9 for the deferred questions). Read §4.3–4.5's imports against the Naming Note above before copying them
- Webhook signature verification: https://docs.stripe.com/webhooks#verify-official-libraries
- Stripe CLI: https://docs.stripe.com/stripe-cli
- Test cards: https://docs.stripe.com/testing
