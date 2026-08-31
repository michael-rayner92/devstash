"use client"

import { File } from "lucide-react"
import { iconMap } from "@/lib/icon-map"
import { relativeTime } from "@/lib/relative-time"
import { useItemTriggerProps } from "@/components/items/item-drawer-provider"
import type { FavoriteItem } from "@/lib/db/favorites"

export function FavoriteItemRow({ item }: { item: FavoriteItem }) {
  const triggerProps = useItemTriggerProps(item.id)
  const Icon = iconMap[item.itemType.icon] ?? File
  const color = item.itemType.color

  return (
    <div
      {...triggerProps}
      className="group flex cursor-pointer items-center gap-3 px-3 py-2 font-mono text-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color }} />
      <span className="min-w-0 truncate text-foreground">{item.title}</span>
      <span
        className="shrink-0 text-[10px] font-medium uppercase tracking-wide"
        style={{ color }}
      >
        {item.itemType.name}
      </span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground/60">
        {relativeTime(item.updatedAt)}
      </span>
    </div>
  )
}
