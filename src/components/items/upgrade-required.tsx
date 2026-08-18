import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProBadge } from "@/components/billing/plan-badge"

export function UpgradeRequired({ typeName }: { typeName: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 py-20 text-center dark:border-amber-400/30 dark:bg-amber-400/5">
      <div className="mb-4 rounded-full bg-amber-500/15 p-3 dark:bg-amber-400/15">
        <Lock className="h-6 w-6 text-amber-600 dark:text-amber-300" />
      </div>
      {/* One heading, badge inline — splitting the sentence across two <h2>s
          would fragment it for screen readers. */}
      {/* Each run is its own span: bare text between flex items becomes an
          anonymous item, so its literal spaces stack on top of the gap. */}
      <h2 className="flex flex-wrap items-center justify-center gap-1.5 text-sm font-medium text-foreground">
        <span className="capitalize">{typeName}s</span>
        <span>are a</span>
        <ProBadge size="sm" showIcon />
        <span>feature</span>
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Upgrade to Pro to upload and store {typeName}s, plus unlock unlimited
        items, collections, and AI features.
      </p>
      <Button asChild className="mt-5">
        <Link href="/upgrade">Upgrade to Pro</Link>
      </Button>
    </div>
  )
}
