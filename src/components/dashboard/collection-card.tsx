import type { CSSProperties } from "react"
import Link from "next/link"
import { Star, File } from "lucide-react"
import { iconMap } from "@/lib/icon-map"
import { relativeTime } from "@/lib/relative-time"
import type { CollectionWithStats } from "@/lib/db/collections"

export function CollectionCard({ collection }: { collection: CollectionWithStats }) {
  const { dominantType, allTypes } = collection
  const color = dominantType?.color ?? "#6b7280"
  const DominantIcon = dominantType ? (iconMap[dominantType.icon] ?? File) : File
  const secondaryTypes = allTypes.filter((t) => t.id !== dominantType?.id)

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group flex flex-col rounded-xl border border-border overflow-hidden hover:border-(--type-color) transition-colors"
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
    </Link>
  )
}
