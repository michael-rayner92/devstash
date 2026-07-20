"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/items/form-field"
import { updateCollection } from "@/actions/collections"

export interface EditableCollection {
  id: string
  name: string
  description: string | null
}

interface CollectionEditDialogProps {
  collection: EditableCollection
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CollectionEditDialog({
  collection,
  open,
  onOpenChange,
}: CollectionEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit collection</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open, so the form re-seeds from the latest
            collection values each time it opens — no syncing effect needed. */}
        {open && (
          <EditForm collection={collection} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditForm({
  collection,
  onClose,
}: {
  collection: EditableCollection
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(collection.name)
  const [description, setDescription] = useState(collection.description ?? "")
  const [saving, setSaving] = useState(false)

  const canSave = name.trim().length > 0 && !saving

  async function handleSave() {
    setSaving(true)
    const result = await updateCollection(collection.id, { name, description })
    setSaving(false)

    if (result.success) {
      toast.success("Collection updated")
      onClose()
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <FormField label="Name" htmlFor="edit-collection-name">
          <Input
            id="edit-collection-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Collection name"
          />
        </FormField>

        <FormField label="Description" htmlFor="edit-collection-description">
          <Textarea
            id="edit-collection-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description"
          />
        </FormField>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </>
  )
}
