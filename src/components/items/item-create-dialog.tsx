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
import { FileUpload } from "@/components/ui/file-upload"
import { FormField } from "@/components/items/form-field"
import { TypeSelector } from "@/components/items/type-selector"
import { ItemFormFields, type ItemFormValues } from "@/components/items/item-form-fields"
import { itemFieldVisibility } from "@/lib/item-fields"
import { parseTagList } from "@/lib/item-tags"
import { useControllableOpen } from "@/lib/use-controllable-open"
import { createItem } from "@/actions/items"
import { uploadItemFile } from "@/lib/upload-item-file"
import type { SidebarItemType } from "@/lib/db/sidebar"
import type { UploadKind } from "@/lib/file-constraints"

const EMPTY_FORM: ItemFormValues = {
  title: "",
  description: "",
  content: "",
  language: "",
  url: "",
  tags: "",
}

interface ItemCreateDialogProps {
  itemTypes: SidebarItemType[]
  /** Whether the AI controls (tag suggestions, description generation) are offered (Pro). */
  canUseAi: boolean
  /** Optional trigger element. Omit when driving the dialog via `open`/`onOpenChange`. */
  trigger?: ReactNode
  /** Preselect this type when opening. Ignored if it isn't a creatable type. */
  initialType?: string
  /** Controlled open state. When provided, the dialog is driven externally. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ItemCreateDialog({
  itemTypes,
  canUseAi,
  trigger,
  initialType,
  open: controlledOpen,
  onOpenChange,
}: ItemCreateDialogProps) {
  const router = useRouter()
  // All system types are creatable (file/image upload to R2; the rest carry a
  // text/url body). Pro gating is unlocked during development.
  const creatableTypes = itemTypes
  const defaultType =
    (initialType && creatableTypes.some((type) => type.name === initialType)
      ? initialType
      : creatableTypes[0]?.name) ?? ""
  const [typeName, setTypeName] = useState(defaultType)
  const [form, setForm] = useState(EMPTY_FORM)
  const [collectionIds, setCollectionIds] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)

  // Discard the form on close, whichever path closed it.
  const { open, setOpen: handleOpenChange } = useControllableOpen(
    controlledOpen,
    onOpenChange,
    () => {
      setForm(EMPTY_FORM)
      setCollectionIds([])
      setFile(null)
      setProgress(null)
      setTypeName(defaultType)
    }
  )

  const show = itemFieldVisibility(typeName)
  const canCreate =
    form.title.trim().length > 0 &&
    (show.file ? file !== null : !show.url || form.url.trim().length > 0) &&
    !creating

  function selectType(name: string) {
    setTypeName(name)
    setFile(null)
  }

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
    if (show.file) {
      if (!file) return
      setCreating(true)
      setProgress(0)
      const fd = new FormData()
      fd.append("file", file)
      fd.append("typeName", typeName)
      fd.append("title", form.title)
      fd.append("description", form.description)
      fd.append("tags", parseTagList(form.tags).join(","))
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
      content: show.content ? form.content : null,
      language: show.language ? form.language : null,
      url: show.url ? form.url : null,
      tags: parseTagList(form.tags),
      collectionIds,
    })
    setCreating(false)
    finish(result.success, result.success ? undefined : result.error)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <TypeSelector types={creatableTypes} selected={typeName} onSelect={selectType} />

          <ItemFormFields
            idPrefix="create"
            typeName={typeName}
            values={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            collectionIds={collectionIds}
            onCollectionIdsChange={setCollectionIds}
            canUseAi={canUseAi}
            disabled={creating}
            // Nothing is uploaded yet, so the local File is the only name available.
            fileName={show.file ? (file?.name ?? null) : null}
            contentRows={6}
            titlePlaceholder="Item title"
            fileSlot={
              show.file && (
                <FormField label={typeName === "image" ? "Image" : "File"}>
                  <FileUpload
                    kind={typeName as UploadKind}
                    value={file}
                    onChange={setFile}
                    disabled={creating}
                    progress={progress}
                  />
                </FormField>
              )
            }
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
