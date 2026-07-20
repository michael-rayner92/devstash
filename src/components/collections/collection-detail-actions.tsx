"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CollectionEditDialog,
  type EditableCollection,
} from "@/components/collections/collection-edit-dialog"
import { CollectionDeleteDialog } from "@/components/collections/collection-delete-dialog"

/**
 * Edit / Favorite / Delete controls for the collection detail page header.
 * Favorite is display-only for now. Deleting navigates back to `/collections`
 * since the current page no longer exists.
 */
export function CollectionDetailActions({ collection }: { collection: EditableCollection }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
        <Button variant="outline" size="sm" aria-label="Favorite">
          <Star className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Delete</span>
        </Button>
      </div>

      <CollectionEditDialog collection={collection} open={editOpen} onOpenChange={setEditOpen} />
      <CollectionDeleteDialog
        collection={{ id: collection.id, name: collection.name }}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push("/collections")}
      />
    </>
  )
}
