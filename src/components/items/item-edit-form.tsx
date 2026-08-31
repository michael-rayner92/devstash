"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { File, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SheetClose } from "@/components/ui/sheet"
import { ItemFormFields, type ItemFormValues } from "@/components/items/item-form-fields"
import { iconMap } from "@/lib/icon-map"
import { itemFieldVisibility } from "@/lib/item-fields"
import { parseTagList } from "@/lib/item-tags"
import { updateItem } from "@/actions/items"
import type { ItemDetail } from "@/lib/db/items"

interface ItemEditFormProps {
  detail: ItemDetail
  /** Whether the AI controls (tag suggestions, description generation) are offered (Pro). */
  canUseAi: boolean
  onCancel: () => void
  onSaved: (detail: ItemDetail) => void
}

export function ItemEditForm({ detail, canUseAi, onCancel, onSaved }: ItemEditFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<ItemFormValues>({
    title: detail.title,
    description: detail.description ?? "",
    content: detail.content ?? "",
    language: detail.language ?? "",
    url: detail.url ?? "",
    tags: detail.tags.map((tag) => tag.name).join(", "),
  })
  const [collectionIds, setCollectionIds] = useState<string[]>(
    detail.collections.map((collection) => collection.id)
  )
  const [saving, setSaving] = useState(false)

  const typeName = detail.itemType.name
  const show = itemFieldVisibility(typeName)
  const Icon = iconMap[detail.itemType.icon] ?? File
  const color = detail.itemType.color
  const canSave = form.title.trim().length > 0 && !saving

  async function handleSave() {
    setSaving(true)
    const result = await updateItem(detail.id, {
      title: form.title,
      description: form.description,
      content: show.content ? form.content : null,
      language: show.language ? form.language : null,
      url: show.url ? form.url : null,
      tags: parseTagList(form.tags),
      collectionIds,
    })
    setSaving(false)

    if (result.success) {
      toast.success("Item updated")
      onSaved(result.data)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      {/* Header — type is not editable, shown for context */}
      <header
        className="flex shrink-0 items-center justify-between border-b border-border p-5"
        style={{ backgroundColor: `${color}0d` }}
      >
        <div className="flex items-center gap-2">
          <div className="rounded-md p-1.5" style={{ backgroundColor: `${color}20` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
            {typeName}
          </span>
          <span className="text-xs text-muted-foreground">· Editing</span>
        </div>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Close">
            <X />
          </Button>
        </SheetClose>
      </header>

      {/* Fields */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <ItemFormFields
          idPrefix="edit"
          typeName={typeName}
          values={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          collectionIds={collectionIds}
          onCollectionIdsChange={setCollectionIds}
          canUseAi={canUseAi}
          disabled={saving}
          fileName={detail.fileName}
        />
      </div>

      {/* Footer — Save / Cancel replace the view-mode action bar */}
      <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-4">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </footer>
    </>
  )
}
