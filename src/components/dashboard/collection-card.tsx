"use client"

import type { CSSProperties, KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { Star, File } from "lucide-react"
import { iconMap } from "@/lib/icon-map"
import { relativeTime } from "@/lib/relative-time"
import { CollectionCardMenu } from "@/components/collections/collection-card-menu"
import type { CollectionWithStats } from "@/lib/db/collections"

export function CollectionCard({ collection }: { collection: CollectionWithStats }) {
  const router = useRouter()
  const { dominantType, allTypes } = collection
  const color = dominantType?.color ?? "#6b7280"
  const DominantIcon = dominantType ? (iconMap[dominantType.icon] ?? File) : File
  const secondaryTypes = allTypes.filter((t) => t.id !== dominantType?.id)

  function navigate() {
    router.push(`/collections/${collection.id}`)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Only navigate when the card itself is focused — not when the key comes
    // from the actions menu button nested inside it.
    if (event.target !== event.currentTarget) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      navigate()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={navigate}
      onKeyDown={handleKeyDown}
      aria-label={collection.name}
      className="group flex flex-col rounded-xl border border-border overflow-hidden hover:border-(--type-color) transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ "--type-color": color } as CSSProperties}
    >
      <div className="h-0.5 w-full" style={{ backgroundColor: color }} />
      <div
        className="flex flex-col flex-1 p-4"
        style={{ background: `linear-gradient(135deg, ${color}28 0%, ${color}08 40%, transparent 70%)` }}
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="rounded-lg p-2" style={{ backgroundColor: `${color}20` }}>
            <DominantIcon className="h-5 w-5" style={{ color }} />
          </div>
          <div className="flex items-center gap-1.5">
            {secondaryTypes.length > 0 && (
              <div className="flex items-center gap-0.5">
                {secondaryTypes.map((t) => {
                  const Icon = iconMap[t.icon] ?? File
                  return <Icon key={t.id} className="h-3.5 w-3.5 opacity-60" style={{ color: t.color }} />
                })}
              </div>
            )}
            {collection.isFavorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
            <CollectionCardMenu
              collection={{
                id: collection.id,
                name: collection.name,
                description: collection.description,
              }}
            />
          </div>
        </div>

        <h3 className="font-semibold text-foreground leading-snug">{collection.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2 flex-1">{collection.description}</p>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span>{collection.itemCount} items</span>
          <span className="ml-auto">Updated {relativeTime(collection.updatedAt)}</span>
        </div>
      </div>
    </div>
  )
}
