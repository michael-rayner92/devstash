"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { File } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CodeEditor } from "@/components/ui/code-editor"
import { MarkdownEditor } from "@/components/ui/markdown-editor"
import { FileUpload } from "@/components/ui/file-upload"
import { iconMap } from "@/lib/icon-map"
import { CONTENT_TYPES, isCodeType, isFileType, isMarkdownType } from "@/lib/item-fields"
import { createItem } from "@/actions/items"
import type { SidebarItemType } from "@/lib/db/sidebar"
import type { UploadKind } from "@/lib/file-constraints"
import type { ItemDetail } from "@/lib/db/items"
import { cn } from "@/lib/utils"

type UploadResult =
  | { ok: true; data: ItemDetail }
  | { ok: false; error: string }

// POST the file item as multipart form data via XHR so upload progress can be
// reported (fetch/Server Actions don't expose upload progress events).
function uploadItemFile(
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/upload")
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener("load", () => {
      try {
        const parsed = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) resolve({ ok: true, data: parsed })
        else resolve({ ok: false, error: parsed.error ?? "Upload failed" })
      } catch {
        resolve({ ok: false, error: "Upload failed. Please try again." })
      }
    })
    xhr.addEventListener("error", () =>
      resolve({ ok: false, error: "Upload failed. Please try again." })
    )
    xhr.send(formData)
  })
}

const EMPTY_FORM = {
  title: "",
  description: "",
  content: "",
  language: "",
  url: "",
  tags: "",
}

interface ItemCreateDialogProps {
  itemTypes: SidebarItemType[]
  trigger: ReactNode
  /** Preselect this type when opening. Ignored if it isn't a creatable type. */
  initialType?: string
}

export function ItemCreateDialog({ itemTypes, trigger, initialType }: ItemCreateDialogProps) {
  const router = useRouter()
  // All system types are creatable (file/image upload to R2; the rest carry a
  // text/url body). Pro gating is unlocked during development.
  const creatableTypes = itemTypes
  const defaultType =
    (initialType && creatableTypes.some((type) => type.name === initialType)
      ? initialType
      : creatableTypes[0]?.name) ?? ""
  const [open, setOpen] = useState(false)
  const [typeName, setTypeName] = useState(defaultType)
  const [form, setForm] = useState(EMPTY_FORM)
  const [file, setFile] = useState<File | null>(null)
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)

  const isFile = isFileType(typeName)
  const showContent = CONTENT_TYPES.has(typeName)
  const isCode = isCodeType(typeName)
  const isMarkdown = isMarkdownType(typeName)
  const showLanguage = isCode
  const showUrl = typeName === "link"
  const canCreate =
    form.title.trim().length > 0 &&
    (isFile ? file !== null : !showUrl || form.url.trim().length > 0) &&
    !creating

  function selectType(name: string) {
    setTypeName(name)
    setFile(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setForm(EMPTY_FORM)
      setFile(null)
      setProgress(null)
      setTypeName(defaultType)
    }
  }

  const tagList = () =>
    form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)

  async function handleCreate() {
    if (isFile) {
      if (!file) return
      setCreating(true)
      setProgress(0)
      const fd = new FormData()
      fd.append("file", file)
      fd.append("typeName", typeName)
      fd.append("title", form.title)
      fd.append("description", form.description)
      fd.append("tags", tagList().join(","))
      const result = await uploadItemFile(fd, setProgress)
      setCreating(false)
      setProgress(null)

      if (result.ok) {
        toast.success("Item created")
        handleOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error)
      }
      return
    }

    setCreating(true)
    const result = await createItem({
      typeName,
      title: form.title,
      description: form.description,
      content: showContent ? form.content : null,
      language: showLanguage ? form.language : null,
      url: showUrl ? form.url : null,
      tags: tagList(),
    })
    setCreating(false)

    if (result.success) {
      toast.success("Item created")
      handleOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Type">
            <div className="grid grid-cols-4 gap-2">
              {creatableTypes.map((type) => {
                const Icon = iconMap[type.icon] ?? File
                const selected = type.name === typeName
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => selectType(type.name)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-md border p-2.5 text-xs capitalize transition-colors",
                      selected ? "bg-accent" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                    style={selected ? { borderColor: type.color, color: type.color } : undefined}
                  >
                    <Icon className="h-4 w-4" style={{ color: type.color }} />
                    {type.name}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Title" htmlFor="create-title">
            <Input
              id="create-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Item title"
            />
          </Field>

          <Field label="Description" htmlFor="create-description">
            <Textarea
              id="create-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Optional description"
            />
          </Field>

          {isFile && (
            <Field label={typeName === "image" ? "Image" : "File"}>
              <FileUpload
                kind={typeName as UploadKind}
                value={file}
                onChange={setFile}
                disabled={creating}
                progress={progress}
              />
            </Field>
          )}

          {showContent && (
            <Field label="Content" htmlFor="create-content">
              {isCode ? (
                <CodeEditor
                  id="create-content"
                  ariaLabel="Content"
                  value={form.content}
                  language={form.language}
                  onChange={(next) => setForm((f) => ({ ...f, content: next }))}
                />
              ) : isMarkdown ? (
                <MarkdownEditor
                  id="create-content"
                  ariaLabel="Content"
                  value={form.content}
                  onChange={(next) => setForm((f) => ({ ...f, content: next }))}
                  placeholder="Item content (Markdown supported)"
                />
              ) : (
                <Textarea
                  id="create-content"
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={6}
                  className="font-mono"
                  placeholder="Item content"
                />
              )}
            </Field>
          )}

          {showLanguage && (
            <Field label="Language" htmlFor="create-language">
              <Input
                id="create-language"
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                placeholder="e.g. typescript"
              />
            </Field>
          )}

          {showUrl && (
            <Field label="URL" htmlFor="create-url">
              <Input
                id="create-url"
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://example.com"
              />
            </Field>
          )}

          <Field label="Tags" htmlFor="create-tags">
            <Input
              id="create-tags"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="comma, separated, tags"
            />
            <p className="mt-1 text-xs text-muted-foreground">Separate tags with commas.</p>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
