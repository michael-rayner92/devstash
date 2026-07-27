import Link from "next/link"
import { Library } from "lucide-react"
import { relativeTime } from "@/lib/relative-time"
import type { FavoriteCollection } from "@/lib/db/favorites"

export function FavoriteCollectionRow({ collection }: { collection: FavoriteCollection }) {
  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group flex items-center gap-3 px-3 py-2 font-mono text-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <Library className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate text-foreground">{collection.name}</span>
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
      </span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground/60">
        {relativeTime(collection.updatedAt)}
      </span>
    </Link>
  )
}
