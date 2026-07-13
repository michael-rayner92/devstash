"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { DragEvent } from "react"
import { File as FileIcon, ImageIcon, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  formatSize,
  getConstraint,
  validateUpload,
  type UploadKind,
} from "@/lib/file-constraints"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  kind: UploadKind
  value: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
  /** Upload progress 0–100 while a request is in flight; null when idle. */
  progress?: number | null
}

export function FileUpload({ kind, value, onChange, disabled, progress }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const constraint = getConstraint(kind)
  const uploading = progress != null

  // Object URL for image previews, derived from the selected file. The
  // cleanup-only effect revokes it when it changes or the component unmounts.
  const previewUrl = useMemo(
    () => (kind === "image" && value ? URL.createObjectURL(value) : null),
    [kind, value]
  )
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function selectFile(file: File | undefined) {
    if (!file) return
    const result = validateUpload(kind, file.name, file.size)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    onChange(file)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    if (disabled || uploading) return
    selectFile(e.dataTransfer.files?.[0])
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (disabled || uploading) return
    setDragging(true)
  }

  // File chosen — show it, with a preview for images and a remove button.
  if (value) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-3">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={value.name}
              className="h-14 w-14 shrink-0 rounded-md border border-border object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
              <FileIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{value.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(value.size)}</p>
          </div>
          {!uploading && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              aria-label="Remove file"
              onClick={() => onChange(null)}
              disabled={disabled}
            >
              <X />
            </Button>
          )}
        </div>

        {uploading && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-muted-foreground">
              Uploading… {progress}%
            </p>
          </div>
        )}
      </div>
    )
  }

  // No file yet — the drop zone.
  const Icon = kind === "image" ? ImageIcon : Upload
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        dragging && "border-primary bg-primary/5",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <Icon className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-foreground">
        Drag &amp; drop, or <span className="text-primary">browse</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {constraint.extensions.join(", ")} · max {formatSize(constraint.maxSize)}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={constraint.extensions.join(",")}
        className="hidden"
        onChange={(e) => selectFile(e.target.files?.[0])}
        disabled={disabled}
      />
    </div>
  )
}
