"use client"

import { useTransition } from "react"
import { toast } from "sonner"

/**
 * A billing action's result. Declared here rather than imported from
 * `@/actions/billing` so this module doesn't depend on the action layer —
 * matching `use-favorite-toggle.ts`.
 */
type BillingSessionAction = () => Promise<
  { success: true; data: { url: string } } | { success: false; error: string }
>

interface BillingRedirect {
  pending: boolean
  /** Runs the action and sends the browser to the Stripe URL it returns. */
  go: (run: BillingSessionAction) => void
}

/**
 * Opens a Stripe-hosted page (Checkout or the billing portal).
 *
 * The billing actions return a URL rather than calling `redirect()` — which
 * throws, and would be swallowed by the `{ success, error }` try/catch
 * convention — so the navigation happens here. It's an external URL, so a full
 * page load rather than a router push. On failure the error goes to a toast and
 * the user stays put.
 */
export function useBillingRedirect(): BillingRedirect {
  const [pending, startTransition] = useTransition()

  function go(run: BillingSessionAction) {
    startTransition(async () => {
      const result = await run()
      if (result.success) {
        window.location.href = result.data.url
      } else {
        toast.error(result.error)
      }
    })
  }

  return { pending, go }
}
