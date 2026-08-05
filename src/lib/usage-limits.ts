/**
 * Free-plan limits and the enforcement kill-switch.
 *
 * Deliberately pure — no DB, no Stripe, no imports at all — so it is trivially
 * unit-testable and safe to import from anywhere (client or server). Stripe
 * specifics (`PRICE_IDS`, `isProStatus`, `baseUrl`) live in `@/lib/stripe`.
 */

export const FREE_ITEM_LIMIT = 50
export const FREE_COLLECTION_LIMIT = 3

/**
 * Enforcement kill-switch. Per project-overview.md, all users have access to
 * everything during development; enforcement flips on at launch.
 *
 * Note the inverted default vs. EMAIL_VERIFICATION_ENABLED (which defaults
 * true): billing must be explicitly opted *in*.
 *
 * A function rather than a module-load `const` so tests can flip it with
 * `vi.stubEnv` without needing `vi.resetModules()` + a dynamic import.
 */
export function billingEnforced(): boolean {
  return process.env.BILLING_ENFORCED === "true"
}

export interface PlanLimits {
  /** null = unlimited */
  items: number | null
  /** null = unlimited */
  collections: number | null
  uploads: boolean
}

const UNLIMITED: PlanLimits = { items: null, collections: null, uploads: true }

export function getPlanLimits(isPro: boolean): PlanLimits {
  if (isPro || !billingEnforced()) return UNLIMITED
  return {
    items: FREE_ITEM_LIMIT,
    collections: FREE_COLLECTION_LIMIT,
    uploads: false,
  }
}

/**
 * Messages below surface directly as Sonner toasts, so each one names the
 * limit that was hit and points at Pro. Each returns null when the action is
 * allowed, so callers read as `if (error) return { success: false, error }`.
 */

export function itemLimitError(isPro: boolean, currentCount: number): string | null {
  const { items } = getPlanLimits(isPro)
  if (items === null || currentCount < items) return null
  return `Free plan is limited to ${items} items. Upgrade to Pro for unlimited items.`
}

export function collectionLimitError(
  isPro: boolean,
  currentCount: number
): string | null {
  const { collections } = getPlanLimits(isPro)
  if (collections === null || currentCount < collections) return null
  return `Free plan is limited to ${collections} collections. Upgrade to Pro for unlimited collections.`
}

export function uploadNotAllowedError(isPro: boolean): string | null {
  if (getPlanLimits(isPro).uploads) return null
  return "File and image uploads are a Pro feature. Upgrade to Pro to enable uploads."
}
