"use client"

import type { CSSProperties, KeyboardEvent, MouseEvent } from "react"
import { useState } from "react"
import { Check, Copy, Pin, Star, File } from "lucide-react"
import { iconMap } from "@/lib/icon-map"
import { relativeTime } from "@/lib/relative-time"
import { useItemDrawer } from "@/components/items/item-drawer-provider"
import type { ItemWithType } from "@/lib/db/items"

export function ItemCard({ item }: { item: ItemWithType }) {
  const { openItem } = useItemDrawer()
  const [copied, setCopied] = useState(false)
  const type = item.itemType
  const Icon = iconMap[type.icon] ?? File
  const color = type.color
  const preview = item.description ?? item.content?.slice(0, 120) ?? item.url ?? ""
  const copyText = item.content ?? item.url ?? ""

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      openItem(item.id)
    }
  }

  async function handleCopy(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (!copyText) return
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be unavailable (e.g. insecure context) — fail silently.
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openItem(item.id)}
      onKeyDown={handleKeyDown}
      className="group flex flex-col rounded-xl border border-border border-l-4 bg-card p-4 hover:border-(--type-color) transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ "--type-color": color, borderLeftColor: color } as CSSProperties}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-4 w-4" style={{ color }} />
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color }}>
            {type.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground/60">
          {item.isPinned && <Pin className="h-3.5 w-3.5" />}
          {item.isFavorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          {copyText && (
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? "Copied" : "Copy content"}
              className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-foreground leading-snug truncate">{item.title}</h3>
      {preview && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2 flex-1">{preview}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag.id} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {tag.name}
            </span>
          ))}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground/60">{relativeTime(item.updatedAt)}</span>
      </div>
    </div>
  )
}
