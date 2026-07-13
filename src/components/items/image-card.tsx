"use client"

import type { CSSProperties, KeyboardEvent } from "react"
import { Pin, Star } from "lucide-react"
import { relativeTime } from "@/lib/relative-time"
import { useItemDrawer } from "@/components/items/item-drawer-provider"
import type { ItemWithType } from "@/lib/db/items"

export function ImageCard({ item }: { item: ItemWithType }) {
  const { openItem } = useItemDrawer()
  const color = item.itemType.color
  const thumbnailUrl = `/api/items/${item.id}/download`

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      openItem(item.id)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openItem(item.id)}
      onKeyDown={handleKeyDown}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card hover:border-(--type-color) transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ "--type-color": color } as CSSProperties}
    >
      <div className="aspect-video overflow-hidden bg-muted/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt={item.fileName ?? item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex items-center justify-between gap-2 p-3">
        <h3 className="min-w-0 flex-1 truncate font-semibold text-foreground leading-snug">
          {item.title}
        </h3>
        <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground/60">
          {item.isPinned && <Pin className="h-3.5 w-3.5" />}
          {item.isFavorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          <span className="text-xs">{relativeTime(item.updatedAt)}</span>
        </div>
      </div>
    </div>
  )
}
