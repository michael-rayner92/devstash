import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

export function UpgradeRequired({ typeName }: { typeName: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
      <div className="mb-4 rounded-full bg-muted p-3">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-sm font-medium text-foreground capitalize">
        {typeName}s are a Pro feature
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Upgrade to Pro to upload and store {typeName}s, plus unlock unlimited
        items, collections, and AI features.
      </p>
      <Button asChild className="mt-5">
        <Link href="/settings#billing">Upgrade to Pro</Link>
      </Button>
    </div>
  )
}