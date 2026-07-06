"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import {
  Check,
  Copy,
  File,
  Library,
  Pencil,
  Pin,
  Star,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react"
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ItemEditForm } from "@/components/items/item-edit-form"
import { iconMap } from "@/lib/icon-map"
import { relativeTime } from "@/lib/relative-time"
import { cn } from "@/lib/utils"
import type { ItemDetail } from "@/lib/db/items"

interface ItemDrawerProps {
  open: boolean
  loading: boolean
  detail: ItemDetail | null
  error: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (detail: ItemDetail) => void
}

export function ItemDrawer({ open, loading, detail, error, onOpenChange, onUpdated }: ItemDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 animate-slide-in-right sm:w-120 sm:max-w-[92vw]"
      >
        <SheetTitle className="sr-only">{detail ? detail.title : "Item details"}</SheetTitle>

        {loading ? (
          <DrawerSkeleton />
        ) : error || !detail ? (
          <DrawerError />
        ) : (
          // Key by id so switching to a different item resets edit mode + form state.
          <DrawerBody key={detail.id} detail={detail} onUpdated={onUpdated} />
        )}
      </SheetContent>
    </Sheet>
  )
}

function CloseButton() {
  return (
    <SheetClose asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Close">
        <X />
      </Button>
    </SheetClose>
  )
}

function DrawerBody({
  detail,
  onUpdated,
}: {
  detail: ItemDetail
  onUpdated: (detail: ItemDetail) => void
}) {
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [copied, setCopied] = useState(false)
  const Icon = iconMap[detail.itemType.icon] ?? File
  const color = detail.itemType.color
  const copyText = detail.content ?? detail.url ?? ""

  if (mode === "edit") {
    return (
      <ItemEditForm
        detail={detail}
        onCancel={() => setMode("view")}
        onSaved={(updated) => {
          onUpdated(updated)
          setMode("view")
        }}
      />
    )
  }

  async function handleCopy() {
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
    <>
      {/* Header */}
      <header
        className="shrink-0 border-b border-border p-5"
        style={{ backgroundColor: `${color}0d` }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-md p-1.5" style={{ backgroundColor: `${color}20` }}>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color }}
            >
              {detail.itemType.name}
            </span>
            {detail.language && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {detail.language}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              aria-label={detail.isPinned ? "Pinned" : "Pin"}
            >
              <Pin className={cn("h-4 w-4", detail.isPinned && "fill-current text-foreground")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              aria-label={detail.isFavorite ? "Favorited" : "Favorite"}
            >
              <Star
                className={cn("h-4 w-4", detail.isFavorite && "fill-amber-400 text-amber-400")}
              />
            </Button>
            <CloseButton />
          </div>
        </div>

        <h2 className="text-xl font-semibold leading-snug text-foreground">{detail.title}</h2>
        {detail.description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{detail.description}</p>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {/* Content */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <SectionLabel>Content</SectionLabel>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-muted-foreground"
              onClick={handleCopy}
              disabled={!copyText}
            >
              {copied ? <Check className="text-emerald-400" /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <ContentBlock detail={detail} />
        </section>

        {/* Tags */}
        <section>
          <SectionLabel className="mb-2 flex items-center gap-1.5">
            <TagIcon className="h-3.5 w-3.5" />
            Tags
          </SectionLabel>
          {detail.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {detail.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/60">No tags</p>
          )}
        </section>

        {/* Collections */}
        <section>
          <SectionLabel className="mb-2 flex items-center gap-1.5">
            <Library className="h-3.5 w-3.5" />
            Collections
          </SectionLabel>
          {detail.collections.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {detail.collections.map((collection) => (
                <span
                  key={collection.id}
                  className="rounded-md border border-border px-2 py-0.5 text-xs text-foreground"
                >
                  {collection.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/60">Not in any collection</p>
          )}
        </section>

        {/* Metadata */}
        <section className="space-y-2 border-t border-border pt-4 text-sm">
          <MetaRow label="Type" value={<span className="capitalize">{detail.itemType.name}</span>} />
          <MetaRow label="Updated" value={relativeTime(new Date(detail.updatedAt))} />
          <MetaRow label="ID" value={<span className="font-mono text-xs">{detail.id}</span>} />
        </section>
      </div>

      {/* Footer action bar */}
      <footer className="flex shrink-0 items-center justify-between border-t border-border p-4">
        <Button variant="ghost" className="gap-2 text-destructive hover:text-destructive">
          <Trash2 />
          Delete
        </Button>
        <Button className="gap-2" onClick={() => setMode("edit")}>
          <Pencil />
          Edit
        </Button>
      </footer>
    </>
  )
}

function ContentBlock({ detail }: { detail: ItemDetail }) {
  if (detail.contentType === "url" && detail.url) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <a
          href={detail.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary underline-offset-4 hover:underline break-all"
        >
          {detail.url}
        </a>
      </div>
    )
  }

  if (detail.contentType === "file") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <File className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{detail.fileName ?? "File"}</p>
          {detail.fileSize != null && (
            <p className="text-xs text-muted-foreground">{formatBytes(detail.fileSize)}</p>
          )}
        </div>
      </div>
    )
  }

  if (detail.content) {
    return (
      <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-3 text-sm font-mono whitespace-pre-wrap wrap-break-word text-foreground">
        {detail.content}
      </pre>
    )
  }

  return <p className="text-sm text-muted-foreground/60">No content</p>
}

function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3
      className={cn(
        "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        className
      )}
    >
      {children}
    </h3>
  )
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}

function DrawerSkeleton() {
  return (
    <div className="flex-1 animate-pulse space-y-6 p-5">
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 rounded bg-muted" />
        <div className="h-8 w-8 rounded bg-muted" />
      </div>
      <div className="h-7 w-2/3 rounded bg-muted" />
      <div className="h-4 w-1/2 rounded bg-muted" />
      <div className="h-28 w-full rounded-lg bg-muted" />
      <div className="flex gap-2">
        <div className="h-5 w-12 rounded bg-muted" />
        <div className="h-5 w-16 rounded bg-muted" />
      </div>
    </div>
  )
}

function DrawerError() {
  return (
    <>
      <header className="flex shrink-0 items-center justify-end border-b border-border p-4">
        <CloseButton />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-5 text-center">
        <p className="text-sm font-medium text-foreground">Couldn&apos;t load this item</p>
        <p className="text-sm text-muted-foreground">
          It may have been deleted, or something went wrong. Try again.
        </p>
      </div>
    </>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}
