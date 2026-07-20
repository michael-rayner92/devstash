"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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
import { FileUpload } from "@/components/ui/file-upload"
import { FormField } from "@/components/items/form-field"
import { ContentField } from "@/components/items/content-field"
import { TypeSelector } from "@/components/items/type-selector"
import { CollectionsField } from "@/components/items/collections-field"
import { CONTENT_TYPES, isCodeType, isFileType } from "@/lib/item-fields"
import { createItem } from "@/actions/items"
import { uploadItemFile } from "@/lib/upload-item-file"
import type { SidebarItemType } from "@/lib/db/sidebar"
import type { UploadKind } from "@/lib/file-constraints"

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
  const [collectionIds, setCollectionIds] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)

  const isFile = isFileType(typeName)
  const showContent = CONTENT_TYPES.has(typeName)
  const showLanguage = isCodeType(typeName)
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
      setCollectionIds([])
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

  // Shared completion for both the file-upload and text/url create paths.
  function finish(ok: boolean, error?: string) {
    if (ok) {
      toast.success("Item created")
      handleOpenChange(false)
      router.refresh()
    } else {
      toast.error(error ?? "Something went wrong. Please try again.")
    }
  }

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
      fd.append("collectionIds", collectionIds.join(","))
      const result = await uploadItemFile(fd, setProgress)
      setCreating(false)
      setProgress(null)
      finish(result.ok, result.ok ? undefined : result.error)
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
      collectionIds,
    })
    setCreating(false)
    finish(result.success, result.success ? undefined : result.error)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <TypeSelector types={creatableTypes} selected={typeName} onSelect={selectType} />

          <FormField label="Title" htmlFor="create-title">
            <Input
              id="create-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Item title"
            />
          </FormField>

          <FormField label="Description" htmlFor="create-description">
            <Textarea
              id="create-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Optional description"
            />
          </FormField>

          {isFile && (
            <FormField label={typeName === "image" ? "Image" : "File"}>
              <FileUpload
                kind={typeName as UploadKind}
                value={file}
                onChange={setFile}
                disabled={creating}
                progress={progress}
              />
            </FormField>
          )}

          {showContent && (
            <ContentField
              id="create-content"
              typeName={typeName}
              value={form.content}
              onChange={(next) => setForm((f) => ({ ...f, content: next }))}
              language={form.language}
              rows={6}
            />
          )}

          {showLanguage && (
            <FormField label="Language" htmlFor="create-language">
              <Input
                id="create-language"
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                placeholder="e.g. typescript"
              />
            </FormField>
          )}

          {showUrl && (
            <FormField label="URL" htmlFor="create-url">
              <Input
                id="create-url"
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://example.com"
              />
            </FormField>
          )}

          <FormField label="Tags" htmlFor="create-tags">
            <Input
              id="create-tags"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="comma, separated, tags"
            />
            <p className="mt-1 text-xs text-muted-foreground">Separate tags with commas.</p>
          </FormField>

          <CollectionsField
            selected={collectionIds}
            onChange={setCollectionIds}
            disabled={creating}
          />
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
