# Stripe Integration Plan

Implementation plan for DevStash Pro subscriptions — **$8/mo** monthly, **$72/yr** annual (advertised as "$6/mo, billed yearly · Save 25%").

Researched against the codebase on **2026-08-05**, and against live Stripe docs (`stripe@22.4.0`, pinned API version `2026-07-29.dahlia`).

---

## 1. Current State Analysis

### 1.1 What already exists

| Thing | Status | Location |
|---|---|---|
| `User.isPro` | ✅ exists, `Boolean @default(false)` | [schema.prisma:28](../prisma/schema.prisma#L28) |
| `User.stripeCustomerId` | ✅ exists, `String? @unique` | [schema.prisma:29](../prisma/schema.prisma#L29) |
| `User.stripeSubscriptionId` | ✅ exists, `String? @unique` | [schema.prisma:30](../prisma/schema.prisma#L30) |
| Stripe env vars | ✅ documented (uncommitted change to `.env.example`) | [.env.example](../.env.example) |
| `stripe` npm package | ❌ **not installed** | — |
| Any Stripe code | ❌ **none** — zero references in `src/` | — |
| Any free-tier limit enforcement | ❌ **none** — limits are display copy only | — |

A `grep -ri "stripe"` across `src/`, `prisma/`, `scripts/`, and `docs/` returns **no** Stripe code. The three `stripe*` columns have existed since the initial migration and have never been read or written.

### 1.2 Where `isPro` is read today

Only **three** places, all cosmetic:

| Location | Use |
|---|---|
| [authenticated-shell.tsx:31](../src/components/dashboard/authenticated-shell.tsx#L31) | Passes `dbUser.isPro` into `DashboardShell` |
| [sidebar-content.tsx:146](../src/components/dashboard/sidebar-content.tsx#L146) | Shows/hides the "Upgrade to Pro" CTA (currently an **inert div**, not a link) |
| [sidebar-content.tsx:168](../src/components/dashboard/sidebar-content.tsx#L168) | Renders the `PRO` / `FREE` badge next to the user avatar |

Separately, [sidebar.ts:4](../src/lib/db/sidebar.ts#L4) has a `PRO_TYPE_NAMES = new Set(["file", "image"])` that drives the `PRO` badge on the file/image sidebar links — but it does **not** gate anything. [item-create-dialog.tsx:57-59](../src/components/items/item-create-dialog.tsx#L57-L59) explicitly comments that "Pro gating is unlocked during development" and offers all 7 types.

### 1.3 NextAuth configuration

Split edge-safe / full config:

- **[src/auth.config.ts](../src/auth.config.ts)** — edge-safe. Providers + `pages.signIn`. **No callbacks.** Used by the proxy.
- **[src/auth.ts](../src/auth.ts)** — full config. Prisma adapter, `session: { strategy: "jwt" }`, `jwt` + `session` callbacks, real bcrypt `authorize`.
- **[src/proxy.ts](../src/proxy.ts)** — `NextAuth(authConfig)` (edge). Protects `/dashboard`, `/profile`, `/settings`, `/items`, `/collections`, `/favorites`. Matcher **excludes `/api`**, so API routes guard themselves.
- **[src/types/next-auth.d.ts](../src/types/next-auth.d.ts)** — augments `Session.user` with `id` only.

**The current JWT callback already does a DB query on every session validation:**

```ts
// src/auth.ts:23-36
async jwt({ token, user }) {
  if (user) return token
  const dbUser = await prisma.user.findUnique({
    where: { id: token.sub! },
    select: { passwordChangedAt: true },   // ← already querying
  })
  if (dbUser?.passwordChangedAt && token.iat! < dbUser.passwordChangedAt.getTime() / 1000) {
    return null
  }
  return token
}
```

> **⚠️ Correction to the research prompt's Notes section.**
> The prompt says the always-sync-`isPro` workaround "adds one small DB query per session validation." **It adds zero.** The query is already there for the `passwordChangedAt` session-invalidation check — `isPro` just needs to be added to the existing `select`. See §3.1 for the merged callback, which is strictly cheaper than the prompt's proposed version (which would have introduced a *second* query).

Two things the prompt's snippet gets wrong for this codebase and that §3.1 fixes:

1. It drops the `passwordChangedAt` check entirely, which would **regress the "sign out everywhere on password change" security feature**.
2. `token.sub = user.id` is redundant — NextAuth already sets `token.sub` before the callback runs (which is why the existing code can safely use `token.sub!` in the non-`user` branch).

### 1.4 How user data is accessed

Two patterns, both present:

**Server components** fetch directly with Prisma. Note both of these already load the full user row (so `isPro` is already in hand, un-`select`ed):

```ts
// src/components/dashboard/authenticated-shell.tsx:13-15  AND
// src/app/dashboard/page.tsx:22-24
const dbUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null
```

**Server actions** follow a strict, consistent shape — worth mirroring exactly:

```ts
"use server"
export async function doThing(input: Input): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Not authenticated" }

  const parsed = schema.safeParse(input)          // Zod is the source of truth
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    const result = await queryFn(session.user.id, parsed.data)   // owner-scoped in the DB layer
    if (!result) return { success: false, error: "Not found" }
    return { success: true, data: result }
  } catch {
    return { success: false, error: "Something went wrong. Please try again." }
  }
}
```

Key convention: **actions validate, the `src/lib/db/*` layer enforces ownership.** Every query takes `userId` as its first arg and scopes with `findFirst({ where: { id, userId } })`.

### 1.5 Existing payment-related code

**None.** No subscription state machine, no billing UI, no webhook route, no customer creation. This is a greenfield integration on top of pre-existing schema columns.

---

## 2. Feature Gating Analysis

### 2.1 Free tier limits (from the spec)

| Limit | Free | Pro | Currently enforced? |
|---|---|---|---|
| Items | **50** | Unlimited | ❌ No |
| Collections | **3** | Unlimited | ❌ No |
| File & image uploads | ❌ | ✅ | ❌ No — all 7 types offered |
| AI features | ❌ | ✅ | n/a — not built yet |
| Custom types | ❌ | ✅ | n/a — not built yet |
| Data export | ❌ | ✅ | n/a — not built yet |

The limits appear **only as display copy** today: `sub="50 on free plan"` and `sub="3 on free plan"` on the dashboard stats cards ([dashboard/page.tsx:53,58](../src/app/dashboard/page.tsx#L53)), and in the homepage `FREE_PLAN.features` array ([home/data.ts](../src/components/home/data.ts)).

> Per [project-overview.md](../context/project-overview.md): *"During development: all users have access to everything. Gate-checks and Stripe wiring scaffold now; enforcement flips on at launch."* → gate behind an env flag (§3.2), defaulting to **off**.

### 2.2 Where counts are already computed

Good news — the count queries exist:

```ts
// src/lib/db/collections.ts:169-176
export async function getDashboardStats(userId: string) {
  const [totalItems, totalCollections, totalFavorites] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
  ])
  return { totalItems, totalCollections, totalFavorites }
}
```

`getProfileData` in [src/lib/db/profile.ts](../src/lib/db/profile.ts) also counts items and collections.

### 2.3 The three enforcement points

There are exactly **three** create paths, and **all three must be gated** or the limit is bypassable:

| # | Path | Entry point | Gate needed |
|---|---|---|---|
| 1 | Text/URL items (snippet, prompt, command, note, link) | `createItem` action — [items.ts:116](../src/actions/items.ts#L116) | Item count < 50 |
| 2 | **File/image items** | `POST /api/upload` — [route.ts:21](../src/app/api/upload/route.ts#L21) | Item count < 50 **AND** `isPro` |
| 3 | Collections | `createCollection` action — [collections.ts:31](../src/actions/collections.ts#L31) | Collection count < 3 |

> **⚠️ Easy-to-miss gap:** file/image items are created via the `/api/upload` route (which calls `createFileItem`), **not** via the `createItem` action. `createItem`'s `CREATABLE_TYPE_NAMES` deliberately excludes `file`/`image` ([items.ts:83](../src/actions/items.ts#L83)). If you only gate the action, a Free user can exceed 50 items — and upload files at all — through the upload endpoint. It already guards auth itself (`const session = await auth()` at line 22, because the proxy matcher excludes `/api`), so it's the right place to add the plan check.

### 2.4 Pro-only features

- **File/image uploads** — `FILE_TYPES = new Set(["file", "image"])` in [item-fields.ts:13](../src/lib/item-fields.ts#L13); `isFileType()` already exists as the client-side branch. `PRO_TYPE_NAMES` in [sidebar.ts:4](../src/lib/db/sidebar.ts#L4) is the server-side equivalent. These two duplicated sets should be unified when gating goes in.
- **AI features / custom types / data export** — not built. Only need the `isPro` plumbing to exist for later.

### 2.5 Settings page structure

[src/app/settings/page.tsx](../src/app/settings/page.tsx) is a server component with a clean, repeatable section pattern — a billing section drops straight in:

```tsx
export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/settings")

  const [account, editorPreferences] = await Promise.all([
    getAccountSettings(session.user.id),
    getEditorPreferences(session.user.id),
  ])
  if (!account) redirect("/sign-in")

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
        {/* back link, <h1>Settings</h1> */}
        <section className="rounded-xl border border-border bg-card p-6">…</section>  {/* Editor preferences */}
        {account.hasPassword && <section …>…</section>}                              {/* Change password */}
        <section className="rounded-xl border border-destructive/40 …">…</section>    {/* Danger zone */}
      </div>
    </div>
  )
}
```

Note the standalone shell — `/settings` is **not** wrapped in `AuthenticatedShell` (no sidebar), and does its own page-level `auth()` guard in addition to the proxy.

---

## 3. Files to Create

### 3.1 `src/lib/stripe.ts` — lazy, memoized client

Mirrors [src/lib/r2.ts](../src/lib/r2.ts) exactly: the client is created lazily so importing the module never throws when env vars are absent (keeps `npm run build` safe).

```ts
import Stripe from "stripe"

/**
 * Stripe API access. The secret key comes from env (see `.env.example`). The
 * client is created lazily and memoized so importing this module never throws
 * when the vars are absent (e.g. during build).
 *
 * `apiVersion` is deliberately omitted — stripe-node pins its own version
 * (2026-07-29.dahlia for v22.4.0) and its TypeScript types match that pin.
 * Passing a different string produces type errors.
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
```

### 3.2 `src/lib/billing.ts` — plan constants + limit helpers (pure, unit-testable)

```ts
// Plan limits and billing configuration. Pure — no DB or Stripe access, so
// this is directly unit-testable (see coding-standards.md test scope).

/**
 * Enforcement kill-switch. Per project-overview.md, all users have access to
 * everything during development; enforcement flips on at launch.
 *
 * Note the inverted default vs. EMAIL_VERIFICATION_ENABLED (which defaults
 * true): billing must be explicitly opted *in*.
 */
export const BILLING_ENFORCED = process.env.BILLING_ENFORCED === "true"

export const FREE_ITEM_LIMIT = 50
export const FREE_COLLECTION_LIMIT = 3

export type BillingInterval = "monthly" | "yearly"

export const PRICE_IDS: Record<BillingInterval, string | undefined> = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY,
  yearly: process.env.STRIPE_PRICE_ID_YEARLY,
}

/** Stripe subscription statuses that grant Pro access. */
const PRO_STATUSES = new Set(["active", "trialing"])

export function isProStatus(status: string | null | undefined): boolean {
  return status ? PRO_STATUSES.has(status) : false
}

export interface PlanLimits {
  items: number | null       // null = unlimited
  collections: number | null
  uploads: boolean
}

export function getPlanLimits(isPro: boolean): PlanLimits {
  if (isPro || !BILLING_ENFORCED) {
    return { items: null, collections: null, uploads: true }
  }
  return { items: FREE_ITEM_LIMIT, collections: FREE_COLLECTION_LIMIT, uploads: false }
}

/** Human-readable message when a create is blocked. Returns null when allowed. */
export function itemLimitError(isPro: boolean, currentCount: number): string | null {
  const { items } = getPlanLimits(isPro)
  if (items === null || currentCount < items) return null
  return `Free plan is limited to ${items} items. Upgrade to Pro for unlimited items.`
}

export function collectionLimitError(isPro: boolean, currentCount: number): string | null {
  const { collections } = getPlanLimits(isPro)
  if (collections === null || currentCount < collections) return null
  return `Free plan is limited to ${collections} collections. Upgrade to Pro for unlimited collections.`
}

export function uploadNotAllowedError(isPro: boolean): string | null {
  return getPlanLimits(isPro).uploads
    ? null
    : "File and image uploads are a Pro feature. Upgrade to Pro to enable uploads."
}

/** Absolute base URL for Stripe redirect targets. Matches src/lib/email.ts. */
export function baseUrl(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000"
}
```

### 3.3 `src/lib/db/billing.ts` — owner-scoped billing queries

```ts
import { prisma } from "@/lib/prisma"

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

/** Lightweight plan+usage read for the create-path gates. */
export async function getPlanUsage(userId: string) {
  const [user, itemCount, collectionCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { isPro: true } }),
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
  ])
  return user ? { isPro: user.isPro, itemCount, collectionCount } : null
}

/** Persist (or clear) the Stripe customer id for a user. */
export async function setStripeCustomerId(userId: string, stripeCustomerId: string) {
  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId } })
}

/**
 * Resolve a webhook's customer id back to our user. Returns null for unknown
 * customers (e.g. events from another environment sharing the same account).
 */
export async function findUserByStripeCustomerId(stripeCustomerId: string) {
  return prisma.user.findUnique({
    where: { stripeCustomerId },
    select: { id: true },
  })
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
 * webhooks, and writing the same state twice is a no-op.
 */
export async function syncSubscription(userId: string, data: SubscriptionSync) {
  await prisma.user.update({ where: { id: userId }, data })
}
```

### 3.4 `src/actions/billing.ts` — checkout + portal server actions

Follows the project's `{ success, data, error }` action shape. Deliberately **returns the URL** rather than calling `redirect()` — `redirect()` throws internally, which fights the `try/catch` convention and would swallow into the generic error branch.

```ts
"use server"

import { z } from "zod"
import { auth } from "@/auth"
import { getStripe } from "@/lib/stripe"
import { baseUrl, PRICE_IDS, type BillingInterval } from "@/lib/billing"
import { getBillingStatus, setStripeCustomerId } from "@/lib/db/billing"

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
  if (!session?.user?.id) return { success: false, error: "Not authenticated" }

  const parsed = checkoutSchema.safeParse({ interval })
  if (!parsed.success) return { success: false, error: "Invalid billing interval" }

  const priceId = PRICE_IDS[parsed.data.interval]
  if (!priceId) return { success: false, error: "Billing is not configured." }

  try {
    const status = await getBillingStatus(session.user.id)
    if (!status) return { success: false, error: "Account not found" }
    if (status.isPro) return { success: false, error: "You're already on Pro." }

    const stripe = getStripe()
    const userId = session.user.id

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
      // Belt and braces: three independent ways for the webhook to find the user.
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
      allow_promotion_codes: true,
      success_url: `${baseUrl()}/settings?checkout=success`,
      cancel_url: `${baseUrl()}/settings?checkout=cancelled`,
    })

    if (!checkout.url) return { success: false, error: "Could not start checkout." }
    return { success: true, data: { url: checkout.url } }
  } catch {
    return { success: false, error: "Something went wrong. Please try again." }
  }
}

/** Open the Stripe-hosted customer portal (manage / cancel / update card). */
export async function createBillingPortalSession(): Promise<BillingSessionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Not authenticated" }

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
```

### 3.5 `src/app/api/stripe/webhook/route.ts` — the webhook handler

The proxy matcher excludes `/api`, so this route is already outside auth — which is correct, Stripe can't carry a session. **Signature verification is the auth.**

```ts
import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { isProStatus } from "@/lib/billing"
import { findUserByStripeCustomerId, syncSubscription } from "@/lib/db/billing"

/**
 * Stripe webhook receiver. Unauthenticated by design — the `stripe-signature`
 * header is the auth. Node runtime (the default) is required: signature
 * verification needs the raw request body, read via `req.text()`.
 */
export const runtime = "nodejs"

/** Map a Stripe subscription onto our user columns. */
function subscriptionSync(sub: Stripe.Subscription) {
  const item = sub.items.data[0]
  return {
    isPro: isProStatus(sub.status),
    stripeSubscriptionId: sub.id,
    stripeSubscriptionStatus: sub.status,
    stripePriceId: item?.price.id ?? null,
    // ⚠️ current_period_end lives on the subscription ITEM, not the
    // subscription, as of API version 2025-10-29.clover onward.
    stripeCurrentPeriodEnd: item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null,
  }
}

async function resolveUserId(
  customerId: string | null,
  metadataUserId: string | undefined
): Promise<string | null> {
  if (metadataUserId) return metadataUserId
  if (!customerId) return null
  const user = await findUserByStripeCustomerId(customerId)
  return user?.id ?? null
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
    // (SubtleCrypto) providers — safe if this ever moves off Node runtime.
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
          typeof session.customer === "string" ? session.customer : null,
          session.metadata?.userId ?? session.client_reference_id ?? undefined
        )
        if (!userId) break

        const subId =
          typeof session.subscription === "string" ? session.subscription : null
        if (!subId) break

        const sub = await stripe.subscriptions.retrieve(subId)
        await syncSubscription(userId, subscriptionSync(sub))
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object
        const userId = await resolveUserId(
          typeof sub.customer === "string" ? sub.customer : null,
          sub.metadata?.userId
        )
        if (!userId) break
        await syncSubscription(userId, subscriptionSync(sub))
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object
        const userId = await resolveUserId(
          typeof sub.customer === "string" ? sub.customer : null,
          sub.metadata?.userId
        )
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
    // Return 500 so Stripe retries with backoff. All handlers are idempotent
    // (they write absolute state, not deltas), so a replay is harmless.
    console.error(`Stripe webhook handler failed for ${event.type}`, err)
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
```

**Why these four events:** `checkout.session.completed` is the fastest signal that a first purchase landed. `customer.subscription.updated` covers renewals, plan switches (monthly ↔ yearly via the portal), `past_due`, and `cancel_at_period_end`. `customer.subscription.deleted` is the definitive downgrade. `created` is belt-and-braces given the Basil change noted in §6.

### 3.6 `src/components/settings/billing-section.tsx` — client component

```tsx
"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createCheckoutSession, createBillingPortalSession } from "@/actions/billing"
import type { BillingInterval } from "@/lib/billing"
import type { BillingStatus } from "@/lib/db/billing"

export function BillingSection({ status }: { status: BillingStatus }) {
  const [interval, setInterval] = useState<BillingInterval>("monthly")
  const [pending, startTransition] = useTransition()

  function go(run: () => Promise<{ success: boolean; data?: { url: string }; error?: string }>) {
    startTransition(async () => {
      const result = await run()
      if (result.success && result.data) {
        window.location.href = result.data.url    // external — full navigation
      } else {
        toast.error(result.error ?? "Something went wrong.")
      }
    })
  }

  if (status.isPro) {
    return (
      <div className="space-y-3">
        {/* plan name, renewal date from status.stripeCurrentPeriodEnd */}
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => go(createBillingPortalSession)}
        >
          Manage subscription
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* usage meters: status.itemCount / 50, status.collectionCount / 3 */}
      {/* monthly ↔ yearly toggle driving `interval` */}
      <Button disabled={pending} onClick={() => go(() => createCheckoutSession(interval))}>
        Upgrade to Pro
      </Button>
    </div>
  )
}
```

### 3.7 Tests to create

Per [coding-standards.md](../context/coding-standards.md), the test scope is **server actions + `src/lib` utilities only** — no component tests. Mock at the module boundary.

| File | Covers |
|---|---|
| `src/lib/billing.test.ts` | `getPlanLimits` (pro / free / `BILLING_ENFORCED=false` unlocks), `itemLimitError` / `collectionLimitError` boundaries (49 → allowed, 50 → blocked), `uploadNotAllowedError`, `isProStatus` for every Stripe status |
| `src/actions/billing.test.ts` | auth guard, invalid interval, missing price env, already-Pro rejection, customer reuse vs. creation, `client_reference_id`/`metadata` are set, throw → generic error; portal: no-customer rejection + success |
| `src/lib/db/billing.test.ts` | `getPlanUsage` / `getBillingStatus` user-scoping and `select` shape, `syncSubscription` write args, `findUserByStripeCustomerId` null on unknown |
| `src/actions/items.test.ts` (extend) | create blocked at the item limit; allowed when Pro; allowed when `BILLING_ENFORCED` is off |
| `src/actions/collections.test.ts` (extend) | same three cases at the 3-collection limit |

Mock `stripe` at the module boundary — never hit the real API:

```ts
vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
  })),
}))
```

`BILLING_ENFORCED` is read at module load, so tests that need it on must use `vi.stubEnv("BILLING_ENFORCED", "true")` **before** a `vi.resetModules()` + dynamic `import()`, or the constant should be read through a function instead. **Recommendation: make it a function** — `export const billingEnforced = () => process.env.BILLING_ENFORCED === "true"` — which is far easier to test and costs nothing.

---

## 4. Files to Modify

### 4.1 `src/auth.ts` — sync `isPro` into the JWT (zero extra queries)

Merge `isPro` into the **existing** query. Note the restructure: the current early `if (user) return token` must go, but the `passwordChangedAt` check has to stay skipped on the sign-in pass (there's no prior `iat` to compare against).

```ts
async jwt({ token, user }) {
  if (!token.sub) return token

  const dbUser = await prisma.user.findUnique({
    where: { id: token.sub },
    select: { passwordChangedAt: true, isPro: true },   // ← isPro added
  })

  // Password-change invalidation only applies to an existing token being
  // re-validated — on sign-in (`user` present) there's no prior `iat`.
  if (
    !user &&
    dbUser?.passwordChangedAt &&
    token.iat! < dbUser.passwordChangedAt.getTime() / 1000
  ) {
    return null
  }

  // Always synced from the DB so a Stripe webhook flipping `isPro` is picked
  // up on the next session validation — a page reload after checkout suffices.
  token.isPro = dbUser?.isPro ?? false

  return token
},
session({ session, token }) {
  if (token.sub) session.user.id = token.sub
  session.user.isPro = token.isPro ?? false
  return session
},
```

**Trade-off worth stating:** this is a deliberate choice of correctness over caching. The JWT is no longer self-contained for `isPro` — every validation hits Postgres. That cost was already being paid for `passwordChangedAt`, so this change is free, but it does mean the app cannot later "optimize away" that query without breaking both features.

### 4.2 `src/types/next-auth.d.ts` — augment `Session` and `JWT`

```ts
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isPro: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isPro?: boolean
  }
}
```

> **⚠️ The proxy will not see `isPro`.** [src/proxy.ts](../src/proxy.ts) builds its own `NextAuth(authConfig)` from the **edge-safe** [auth.config.ts](../src/auth.config.ts), which has **no callbacks** — so `req.auth.user.isPro` is always undefined there. Do **not** try to gate Pro routes in the proxy. Gate in server components (`auth()` / a `getBillingStatus` read) and in server actions. This is the same reason the real `authorize` lives in `auth.ts`.

### 4.3 `src/actions/items.ts` — item limit gate

Add to `createItem`, after Zod validation and before the query:

```ts
import { itemLimitError } from "@/lib/billing"
import { getPlanUsage } from "@/lib/db/billing"

// …inside createItem, after `parsed` succeeds:
const usage = await getPlanUsage(session.user.id)
if (!usage) return { success: false, error: "Account not found" }

const limitError = itemLimitError(usage.isPro, usage.itemCount)
if (limitError) return { success: false, error: limitError }
```

The existing client already surfaces `result.error` as a Sonner toast, so the limit message reaches the user with no UI change.

### 4.4 `src/actions/collections.ts` — collection limit gate

Same shape in `createCollection`, using `collectionLimitError(usage.isPro, usage.collectionCount)`.

### 4.5 `src/app/api/upload/route.ts` — Pro gate **and** item limit

**This is the gap flagged in §2.3.** Add after the existing auth guard (line 22-26) and before the R2 upload:

```ts
import { itemLimitError, uploadNotAllowedError } from "@/lib/billing"
import { getPlanUsage } from "@/lib/db/billing"

const usage = await getPlanUsage(userId)
if (!usage) {
  return NextResponse.json({ error: "Account not found" }, { status: 401 })
}

const proError = uploadNotAllowedError(usage.isPro)
if (proError) return NextResponse.json({ error: proError }, { status: 403 })

const limitError = itemLimitError(usage.isPro, usage.itemCount)
if (limitError) return NextResponse.json({ error: limitError }, { status: 403 })
```

Place the check **before** `uploadToR2` so a rejected upload never leaves an orphaned R2 object.

### 4.6 `src/components/dashboard/sidebar-content.tsx` — make the CTA work

The "Upgrade to Pro" block at lines 146-154 is currently an **inert `<div>`**. Wrap it in `<Link href="/settings#billing">`. Add a `scroll-mt` on the billing section so the anchor lands clear of the page top.

### 4.7 `src/app/settings/page.tsx` — mount the billing section

Add `getBillingStatus` to the existing `Promise.all`, and a new section as the **first** card (billing above editor preferences):

```tsx
const [account, editorPreferences, billing] = await Promise.all([
  getAccountSettings(session.user.id),
  getEditorPreferences(session.user.id),
  getBillingStatus(session.user.id),
])
if (!account || !billing) redirect("/sign-in")

// …
<section id="billing" className="scroll-mt-6 rounded-xl border border-border bg-card p-6">
  <h2 className="text-base font-semibold">Plan &amp; billing</h2>
  <p className="mb-4 text-sm text-muted-foreground">
    {billing.isPro ? "You're on DevStash Pro." : "You're on the Free plan."}
  </p>
  <BillingSection status={billing} />
</section>
```

Also handle the `?checkout=success` / `?checkout=cancelled` params from §3.4 — read `searchParams` and show a Sonner toast, mirroring how `/sign-in` handles `?registered=1` and `?verified=1` in [sign-in-form.tsx](../src/components/auth/sign-in-form.tsx).

### 4.8 `src/app/dashboard/page.tsx` — plan-aware stats copy

The hard-coded `sub="50 on free plan"` / `sub="3 on free plan"` / `sub="upgrade to unlock"` strings (lines 53, 58, 68) should read from `getPlanLimits(dbUser.isPro)` so a Pro user doesn't see Free-plan copy. `dbUser` already carries `isPro` (§1.4) — no extra query.

### 4.9 `prisma/schema.prisma` — three new columns (recommended)

The three existing `stripe*` columns are enough for a minimal integration, but the settings UI can't show "renews on X" or distinguish `past_due` from `active` without these:

```prisma
model User {
  // … existing fields
  isPro                    Boolean   @default(false)
  stripeCustomerId         String?   @unique
  stripeSubscriptionId     String?   @unique
  stripeSubscriptionStatus String?   // active | trialing | past_due | canceled | unpaid | incomplete
  stripePriceId            String?   // which plan — monthly or yearly
  stripeCurrentPeriodEnd   DateTime? // renewal / expiry date for the billing UI
}
```

> **🚨 Migration policy** ([project-overview.md](../context/project-overview.md), [coding-standards.md](../context/coding-standards.md)): use `npm run db:migrate` (`prisma migrate dev`), **never** `prisma db push`. Run against the Neon **development** branch (`br-plain-smoke-ald1szfh`) only — never production without explicit confirmation. Then run `prisma generate` explicitly: per the editor-preferences entry in [current-feature.md](../context/current-feature.md), `migrate dev` left a stale client and the build's type-check failed until the client was regenerated.

### 4.10 `.env.example` — add the enforcement flag

The five `STRIPE_*` vars are already present (uncommitted). Add:

```bash
# Set to true to enforce Free-plan limits and Pro gating (off during development)
BILLING_ENFORCED=false
```

### 4.11 `src/components/home/pricing-toggle.tsx` — optional

Both plan CTAs currently point at `/register` ([data.ts](../src/components/home/data.ts)). For a signed-in Free user, the Pro CTA could go straight to checkout instead. `PricingToggle` already owns the `yearly` state, so it knows the interval — it would just need the session's signed-in state threaded down from the server `Pricing` component.

> **Copy mismatch to resolve:** `PRO_PLAN.cta.label` is **"Start Pro Trial"**, but nothing in the plan configures a trial. Either pass `subscription_data: { trial_period_days: N }` in §3.4 or change the label to "Upgrade to Pro". Shipping a "trial" button that charges immediately is a refund/chargeback risk.

---

## 5. Stripe Dashboard Setup

All steps in **Test mode** first.

1. **Product** → *Product catalogue → Add product*
   - Name: `DevStash Pro`
   - Description: `Unlimited items & collections, file uploads, AI features, data export`

2. **Two recurring prices** on that product:
   | Price | Amount | Interval | Env var |
   |---|---|---|---|
   | Monthly | $8.00 AUD | Monthly | `STRIPE_PRICE_ID_MONTHLY` |
   | Annual | $72.00 AUD | Yearly | `STRIPE_PRICE_ID_YEARLY` |

   > **Currency:** the live test-mode prices are **AUD**, not USD as this plan originally assumed. Verified against the API on 2026-08-05 (`prod_V12tZGzbuydXaC`, both prices active). The homepage shows a bare `$`, so this is self-consistent. A price's currency cannot be changed after creation — switching would mean new prices plus new env values.

   Copy each `price_…` id into `.env.local`. **Note:** the annual price is a single $72/yr charge — the "$6/mo" on the homepage is presentation only (`$72 ÷ 12`). Do **not** create a $6/month price.

3. **API keys** → *Developers → API keys* → copy the test secret key into `STRIPE_SECRET_KEY`.
   `STRIPE_PUBLISHABLE_KEY` is in `.env.example` but **this plan never uses it** — hosted Checkout and the hosted portal need no client-side Stripe.js. Leave it for a future Elements-based flow, or drop it.

4. **Customer portal** → *Settings → Billing → Customer portal*
   - Enable: cancel subscription, update payment method, invoice history
   - Enable *switch plans* and add both prices, so monthly ↔ yearly happens in the portal (this is what makes `customer.subscription.updated` matter)
   - Set the default return URL to `<your-domain>/settings`

5. **Webhook endpoint** → *Developers → Webhooks → Add endpoint*
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`

6. **Local development** — use the Stripe CLI instead of a dashboard endpoint:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   The CLI prints a `whsec_…` for the session — that goes in local `STRIPE_WEBHOOK_SECRET`. It differs from the dashboard endpoint's secret.

7. **Billing settings** → consider enabling *Smart Retries* and setting subscription behaviour on failed payment (cancel vs. leave `past_due`). This determines whether `isPro` revokes via `updated` (`past_due`) or `deleted`.

---

## 6. Gotchas Verified Against Live Docs

These were checked against `stripe@22.4.0` / API `2026-07-29.dahlia`, not recalled:

1. **`current_period_end` is no longer on the Subscription.** It moved to the **subscription item** (`sub.items.data[0].current_period_end`) as of `2025-10-29.clover`. Reading `sub.current_period_end` is the single most common way this integration silently stores `null`. Handled in §3.5.

2. **Don't pass `apiVersion`.** stripe-node pins its own version and its TypeScript types match that pin; passing a different string is a type error. Omit it (§3.1).

3. **Subscription creation is postponed.** As of `2025-03-31.basil`, subscription-mode Checkout Sessions defer subscription creation until **after** payment completes. `session.subscription` should be populated by `checkout.session.completed`, but §3.5 handles a null and `customer.subscription.created` covers the gap.

4. **`total_count` expansion on lists was removed** in Basil. Not used here, but don't reach for it.

5. **Raw body is required for signature verification.** In App Router this is just `await req.text()` — no `bodyParser: false` equivalent needed (that was a Pages-Router concern). But you must not read the body any other way first.

6. **`stripeCustomerId` is `@unique`.** A double-clicked upgrade button could try to create two customers for one user and hit a constraint violation. §3.4 uses `idempotencyKey: "customer:${userId}"`.

7. **Postgres allows multiple NULLs in a unique column** — so nulling `stripeSubscriptionId` on cancellation (§3.5) is safe across many users.

---

## 7. Testing Checklist

### Automated (`npm run test`)

- [ ] `src/lib/billing.test.ts` — limits, boundaries (49 allowed / 50 blocked), status mapping, enforcement flag off
- [ ] `src/actions/billing.test.ts` — auth guard, bad interval, unconfigured price, already-Pro, customer reuse vs. create, checkout params, portal
- [ ] `src/lib/db/billing.test.ts` — scoping, select shape, sync write args
- [ ] Extended `items.test.ts` / `collections.test.ts` — create blocked at limit, allowed for Pro, allowed when unenforced
- [ ] `npm run test` and `npm run build` both green

### Manual — happy path

- [ ] `stripe listen --forward-to localhost:3000/api/stripe/webhook` running
- [ ] Signed-in Free user: `/settings` shows the Free plan + usage counts
- [ ] "Upgrade to Pro" (monthly) → Stripe Checkout with $8.00/month
- [ ] Pay with `4242 4242 4242 4242`, any future expiry, any CVC
- [ ] Redirects to `/settings?checkout=success` with a success toast
- [ ] CLI shows `checkout.session.completed` → `200`
- [ ] DB: `isPro=true`, `stripeCustomerId`, `stripeSubscriptionId`, `stripeSubscriptionStatus="active"`, `stripeCurrentPeriodEnd` **not null** (this is where gotcha §6.1 shows up)
- [ ] **Reload** → sidebar badge flips `FREE` → `PRO` and the upgrade CTA disappears (this is the §4.1 JWT sync working)
- [ ] Yearly checkout charges **$72.00/year**

### Manual — gating (with `BILLING_ENFORCED=true`)

- [ ] Free user at 50 items: create is rejected with the limit toast
- [ ] Free user at 3 collections: create is rejected with the limit toast
- [ ] Free user file upload: rejected 403 with the Pro message; **no orphan object in R2**
- [ ] Pro user: all three succeed
- [ ] With `BILLING_ENFORCED=false`: all three succeed for a Free user (dev-unlocked default)

### Manual — lifecycle

- [ ] Portal → cancel → `customer.subscription.updated` (`cancel_at_period_end`) → still Pro until period end
- [ ] `stripe trigger customer.subscription.deleted` → `isPro=false`, subscription id cleared
- [ ] Portal → switch monthly → yearly → `stripePriceId` updates
- [ ] Failed payment card `4000 0000 0000 0341` → `past_due` handled per your §5.7 setting
- [ ] Redelivery: replay an event from the CLI → same DB state, no error (idempotency)

### Manual — security

- [ ] `POST /api/stripe/webhook` with **no** `stripe-signature` → 400
- [ ] With a **tampered** body/signature → 400, no DB write
- [ ] `createCheckoutSession` while signed out → `"Not authenticated"`
- [ ] `createBillingPortalSession` for a user with no `stripeCustomerId` → clean error, no crash
- [ ] A webhook for an unknown `customer` id → 200, no write (the `resolveUserId` null path)
- [ ] Cannot set `isPro` from any client-supplied input — grep confirms `isPro` is only ever written by the webhook

---

## 8. Implementation Order

Each step builds and tests green before the next. Follow the [ai-interaction.md](../context/ai-interaction.md) workflow — document in `current-feature.md`, branch as `feature/stripe-billing`, and don't commit until `npm run test` and `npm run build` pass.

| # | Step | Deliverable |
|---|---|---|
| 1 | `npm install stripe` + add `BILLING_ENFORCED` to `.env.example` | Dependency in place |
| 2 | Migration for the three new columns (§4.9) on the Neon **development** branch, then `prisma generate` | Schema ready |
| 3 | `src/lib/billing.ts` + `src/lib/billing.test.ts` | Pure limits logic, fully tested, nothing wired |
| 4 | `src/lib/stripe.ts` + `src/lib/db/billing.ts` (+ tests) | Data + client layer |
| 5 | **Session plumbing**: `src/auth.ts` + `next-auth.d.ts` (§4.1, §4.2) | `session.user.isPro` available; verify the sidebar badge still reads correctly and password-change sign-out still works |
| 6 | Stripe Dashboard setup (§5) + `stripe listen` running | Test-mode product, prices, portal, secrets in `.env.local` |
| 7 | `src/actions/billing.ts` + tests | Checkout + portal actions |
| 8 | `src/app/api/stripe/webhook/route.ts` | End-to-end: pay a test card, watch `isPro` flip |
| 9 | `BillingSection` + settings page wiring (§3.6, §4.7) + sidebar CTA link (§4.6) | Full upgrade/manage UI |
| 10 | **Gating last**: items action, collections action, upload route (§4.3–4.5) + extended tests | Enforcement, still `false` by default |
| 11 | Dashboard stats copy (§4.8), resolve the "Start Pro Trial" copy question (§4.11) | Polish |
| 12 | Full manual checklist (§7) at `BILLING_ENFORCED` both off and on | Verified |

**Why gating comes last (step 10):** it's the only part that can break existing working flows for every user, and it's the easiest to verify once the plan state it depends on is already trustworthy. Building it earlier means debugging limit logic against an `isPro` you don't yet trust.

**Why session plumbing comes before the webhook (step 5 before 8):** without it, a successful webhook write is invisible in the UI and you can't tell a broken webhook from a stale session.

---

## 9. Open Questions

1. **Trial or no trial?** The homepage says "Start Pro Trial" but nothing configures one (§4.11). Decide: add `trial_period_days`, or change the copy.
2. **`past_due` behaviour** — revoke Pro immediately, or keep access through Smart Retries? Affects §5.7 and which event does the downgrade.
3. **Existing over-limit users.** Queried against the Neon development branch on 2026-08-05 — **both** existing users are already over the Free collection limit:

   | User | `isPro` | Items | Collections | Over limit? |
   |---|---|---|---|---|
   | `demo@devstash.io` | `false` | 18 / 50 | **5 / 3** | ❌ collections |
   | `michael.rayner@neanex.com` | `false` | 21 / 50 | **5 / 3** | ❌ collections |

   Neither has a `stripeCustomerId` or `stripeSubscriptionId` (both null), so there's no legacy billing state to migrate. But the moment `BILLING_ENFORCED=true`, both accounts hit a hard wall on creating collections. Enforcement blocks *new* creates only — it never deletes — so nothing is lost, but confirm that's the intended launch behaviour, and note that flipping the flag on will immediately break the collection-create flow during manual testing unless you upgrade the test account first.
4. **`STRIPE_PUBLISHABLE_KEY`** — unused by this plan (hosted Checkout + hosted portal). Keep as a placeholder or remove from `.env.example`?
5. **Proration** on monthly → yearly switches — Stripe's portal default is to prorate. Confirm that's wanted.
6. **Should `getPlanUsage` be cached?** It adds two `count` queries to every create. Fine at current scale; worth noting if item counts grow large.
