"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { File, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SheetClose } from "@/components/ui/sheet"
import { FormField } from "@/components/items/form-field"
import { ContentField } from "@/components/items/content-field"
import { CollectionsField } from "@/components/items/collections-field"
import { iconMap } from "@/lib/icon-map"
import { CONTENT_TYPES, isCodeType } from "@/lib/item-fields"
import { updateItem } from "@/actions/items"
import type { ItemDetail } from "@/lib/db/items"

interface ItemEditFormProps {
  detail: ItemDetail
  onCancel: () => void
  onSaved: (detail: ItemDetail) => void
}

export function ItemEditForm({ detail, onCancel, onSaved }: ItemEditFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(detail.title)
  const [description, setDescription] = useState(detail.description ?? "")
  const [content, setContent] = useState(detail.content ?? "")
  const [language, setLanguage] = useState(detail.language ?? "")
  const [url, setUrl] = useState(detail.url ?? "")
  const [tags, setTags] = useState(detail.tags.map((tag) => tag.name).join(", "))
  const [collectionIds, setCollectionIds] = useState<string[]>(
    detail.collections.map((collection) => collection.id)
  )
  const [saving, setSaving] = useState(false)

  const typeName = detail.itemType.name
  const showContent = CONTENT_TYPES.has(typeName)
  const showLanguage = isCodeType(typeName)
  const showUrl = typeName === "link"
  const Icon = iconMap[detail.itemType.icon] ?? File
  const color = detail.itemType.color
  const canSave = title.trim().length > 0 && !saving

  async function handleSave() {
    setSaving(true)
    const result = await updateItem(detail.id, {
      title,
      description,
      content: showContent ? content : null,
      language: showLanguage ? language : null,
      url: showUrl ? url : null,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
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
        <FormField label="Title" htmlFor="edit-title">
          <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </FormField>

        <FormField label="Description" htmlFor="edit-description">
          <Textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional description"
          />
        </FormField>

        {showContent && (
          <ContentField
            id="edit-content"
            typeName={typeName}
            value={content}
            onChange={setContent}
            language={language}
          />
        )}

        {showLanguage && (
          <FormField label="Language" htmlFor="edit-language">
            <Input
              id="edit-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. typescript"
            />
          </FormField>
        )}

        {showUrl && (
          <FormField label="URL" htmlFor="edit-url">
            <Input
              id="edit-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </FormField>
        )}

        <FormField label="Tags" htmlFor="edit-tags">
          <Input
            id="edit-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="comma, separated, tags"
          />
          <p className="mt-1 text-xs text-muted-foreground">Separate tags with commas.</p>
        </FormField>

        <CollectionsField
          selected={collectionIds}
          onChange={setCollectionIds}
          disabled={saving}
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
