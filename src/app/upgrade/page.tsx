import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { auth } from "@/auth"
import { getBillingStatus } from "@/lib/db/billing"
import { FREE_COLLECTION_LIMIT, FREE_ITEM_LIMIT } from "@/lib/usage-limits"
import { PlanBadge } from "@/components/billing/plan-badge"
import { UpgradePlans } from "@/components/billing/upgrade-plans"

export default async function UpgradePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/upgrade")

  const billing = await getBillingStatus(session.user.id)
  if (!billing) redirect("/sign-in")

  // Nothing to sell here in two cases, and settings handles both: a Pro user has
  // the portal, and a *lapsed* subscription (past_due/unpaid — still a live
  // Stripe subscription, just not granting Pro) needs a card update rather than
  // a second subscription.
  if (billing.isPro || billing.stripeSubscriptionId) redirect("/settings#billing")

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">Upgrade to DevStash Pro</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Unlimited items and collections, file &amp; image uploads, and the AI
            features — auto-tagging, summaries, explain-this-code, and the prompt
            optimizer.
          </p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <PlanBadge isPro={false} size="sm" />
            <span>
              You&apos;re using {billing.itemCount} of {FREE_ITEM_LIMIT} items and{" "}
              {billing.collectionCount} of {FREE_COLLECTION_LIMIT} collections.
            </span>
          </p>
        </div>

        <UpgradePlans />
      </div>
    </div>
  )
}
