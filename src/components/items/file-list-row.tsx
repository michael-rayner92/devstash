"use client"

import type { CSSProperties, KeyboardEvent, MouseEvent } from "react"
import { Download, File, Pin, Star } from "lucide-react"
import { relativeTime } from "@/lib/relative-time"
import { extensionOf, formatSize } from "@/lib/file-constraints"
import { EXTENSION_ICON } from "@/lib/file-icon"
import { useItemDrawer } from "@/components/items/item-drawer-provider"
import type { ItemWithType } from "@/lib/db/items"

export function FileListRow({ item }: { item: ItemWithType }) {
  const { openItem } = useItemDrawer()
  const color = item.itemType.color
  const fileName = item.fileName ?? item.title
  const Icon = EXTENSION_ICON[extensionOf(fileName)] ?? File
  const downloadUrl = `/api/items/${item.id}/download?download=1`

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      openItem(item.id)
    }
  }

  function handleDownloadClick(event: MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openItem(item.id)}
      onKeyDown={handleKeyDown}
      className="group flex flex-col gap-3 border-b border-border p-4 last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:gap-4"
      style={{ "--type-color": color } as CSSProperties}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="shrink-0 rounded-lg p-2" style={{ backgroundColor: `${color}20` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{item.title}</p>
          <p className="truncate text-xs text-muted-foreground">{fileName}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="flex items-center gap-3 text-xs text-muted-foreground/80">
          {item.isPinned && <Pin className="h-3.5 w-3.5" />}
          {item.isFavorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          {item.fileSize != null && <span className="whitespace-nowrap">{formatSize(item.fileSize)}</span>}
          <span className="whitespace-nowrap">{relativeTime(item.updatedAt)}</span>
        </div>
        <a
          href={downloadUrl}
          onClick={handleDownloadClick}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-(--type-color) hover:text-(--type-color) transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>
    </div>
  )
}
