"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import {
  Check,
  Copy,
  Download,
  File,
  Library,
  Pencil,
  Pin,
  Star,
  Tag as TagIcon,
  X,
} from "lucide-react"
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { CodeEditor } from "@/components/ui/code-editor"
import { MarkdownEditor } from "@/components/ui/markdown-editor"
import { DeleteItemDialog } from "@/components/items/item-delete-dialog"
import { ItemEditForm } from "@/components/items/item-edit-form"
import { iconMap } from "@/lib/icon-map"
import { isCodeType, isMarkdownType } from "@/lib/item-fields"
import { formatSize } from "@/lib/file-constraints"
import { relativeTime } from "@/lib/relative-time"
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard"
import { cn } from "@/lib/utils"
import type { ItemDetail } from "@/lib/db/items"

interface ItemDrawerProps {
  open: boolean
  loading: boolean
  detail: ItemDetail | null
  error: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (detail: ItemDetail) => void
  onDeleted: () => void
}

export function ItemDrawer({
  open,
  loading,
  detail,
  error,
  onOpenChange,
  onUpdated,
  onDeleted,
}: ItemDrawerProps) {
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
          <DrawerBody key={detail.id} detail={detail} onUpdated={onUpdated} onDeleted={onDeleted} />
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
  onDeleted,
}: {
  detail: ItemDetail
  onUpdated: (detail: ItemDetail) => void
  onDeleted: () => void
}) {
  const [mode, setMode] = useState<"view" | "edit">("view")
  const { copied, copy } = useCopyToClipboard()
  const Icon = iconMap[detail.itemType.icon] ?? File
  const color = detail.itemType.color
  const copyText = detail.content ?? detail.url ?? ""
  // Code and markdown types render in editors that carry their own copy button.
  const isCode = isCodeType(detail.itemType.name)
  const isMarkdown = isMarkdownType(detail.itemType.name)
  // File types have no copyable text — they get a download button instead.
  const isFile = detail.contentType === "file"

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
            {/* Code/markdown editors carry their own copy button; file types
                get a download button instead of copy. */}
            {!isCode && !isMarkdown && !isFile && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-muted-foreground"
                onClick={() => copy(copyText)}
                disabled={!copyText}
              >
                {copied ? <Check className="text-emerald-400" /> : <Copy />}
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </div>
          <ContentBlock detail={detail} isCode={isCode} isMarkdown={isMarkdown} />
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
        <DeleteItemDialog itemId={detail.id} itemTitle={detail.title} onDeleted={onDeleted} />
        <Button className="gap-2" onClick={() => setMode("edit")}>
          <Pencil />
          Edit
        </Button>
      </footer>
    </>
  )
}

function ContentBlock({
  detail,
  isCode,
  isMarkdown,
}: {
  detail: ItemDetail
  isCode: boolean
  isMarkdown: boolean
}) {
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
    const isImage = detail.itemType.name === "image"
    const downloadUrl = `/api/items/${detail.id}/download`
    return (
      <div className="space-y-3">
        {isImage && (
          <a href={downloadUrl} target="_blank" rel="noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={downloadUrl}
              alt={detail.fileName ?? detail.title}
              className="max-h-80 w-full rounded-lg border border-border bg-muted/30 object-contain"
            />
          </a>
        )}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <File className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{detail.fileName ?? "File"}</p>
            {detail.fileSize != null && (
              <p className="text-xs text-muted-foreground">{formatSize(detail.fileSize)}</p>
            )}
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
            <a href={`${downloadUrl}?download=1`}>
              <Download className="h-4 w-4" />
              Download
            </a>
          </Button>
        </div>
      </div>
    )
  }

  if (detail.content) {
    if (isCode) {
      return <CodeEditor readOnly value={detail.content} language={detail.language} />
    }
    if (isMarkdown) {
      return <MarkdownEditor readOnly value={detail.content} />
    }
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
