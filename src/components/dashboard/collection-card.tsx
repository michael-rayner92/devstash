"use client"

import type { CSSProperties, MouseEvent } from "react"
import Link from "next/link"
import { Star, File } from "lucide-react"
import { iconMap } from "@/lib/icon-map"
import { relativeTime } from "@/lib/relative-time"
import { useFavoriteToggle } from "@/lib/use-favorite-toggle"
import { toggleCollectionFavorite } from "@/actions/collections"
import { cn } from "@/lib/utils"
import { CollectionCardMenu } from "@/components/collections/collection-card-menu"
import type { CollectionWithStats } from "@/lib/db/collections"

export function CollectionCard({ collection }: { collection: CollectionWithStats }) {
  const { dominantType, allTypes } = collection
  const color = dominantType?.color ?? "#6b7280"
  const DominantIcon = dominantType ? (iconMap[dominantType.icon] ?? File) : File
  const secondaryTypes = allTypes.filter((t) => t.id !== dominantType?.id)
  const dominantLabel = dominantType ? `Mostly ${dominantType.name}s` : "No items yet"
  const { isFavorite, isPending, toggle } = useFavoriteToggle(
    collection.id,
    collection.isFavorite,
    toggleCollectionFavorite
  )

  function handleFavoriteClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    toggle()
  }

  return (
    /* The card is navigated by a real <Link> on the title, stretched over the
       whole card by its ::before overlay. It used to be a role="button" div
       calling router.push, which lost cmd-click, middle-click, and the status
       bar URL preview. Nested controls sit above the overlay via z-10. */
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-border overflow-hidden transition-colors",
        "hover:border-(--type-color)",
        "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring"
      )}
      style={{ "--type-color": color } as CSSProperties}
    >
      <div className="h-0.5 w-full" style={{ backgroundColor: color }} />
      <div
        className="flex flex-col flex-1 p-4"
        style={{ background: `linear-gradient(135deg, ${color}28 0%, ${color}08 40%, transparent 70%)` }}
      >
        <div className="mb-3 flex items-start justify-between">
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: `${color}20` }}
            title={dominantLabel}
          >
            <DominantIcon className="h-5 w-5" style={{ color }} />
          </div>
          <div className="relative z-10 flex items-center gap-1.5">
            {secondaryTypes.length > 0 && (
              <div className="flex items-center gap-0.5">
                {secondaryTypes.map((t) => {
                  const Icon = iconMap[t.icon] ?? File
                  return (
                    <Icon key={t.id} className="h-3.5 w-3.5 opacity-60" style={{ color: t.color }} />
                  )
                })}
              </div>
            )}
            <button
              type="button"
              onClick={handleFavoriteClick}
              disabled={isPending}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={cn(
                // p-1.5 lifts the hit area to 28x28; the icon stays 16x16.
                "rounded-md p-1.5 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground/60"
              )}
            >
              <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-400 text-yellow-400")} />
            </button>
            <CollectionCardMenu
              collection={{
                id: collection.id,
                name: collection.name,
                description: collection.description,
              }}
              isFavorite={isFavorite}
              onToggleFavorite={toggle}
            />
          </div>
        </div>

        <h3 className="font-semibold text-foreground leading-snug">
          <Link
            href={`/collections/${collection.id}`}
            className="before:absolute before:inset-0 before:z-0 before:content-[''] focus-visible:outline-none"
          >
            {collection.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2 flex-1">{collection.description}</p>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            title={dominantLabel}
          />
          <span className="whitespace-nowrap">{collection.itemCount} items</span>
          {/* The dot and the card's top bar convey the dominant type by color
              alone. There is no room for it inline at 4 columns, so expose it to
              assistive tech and on hover instead. */}
          <span className="sr-only">{dominantLabel}</span>
          <span className="ml-auto shrink-0">Updated {relativeTime(collection.updatedAt)}</span>
        </div>
      </div>
    </div>
  )
}
