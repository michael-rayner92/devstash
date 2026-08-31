"use client"

import { useState } from "react"
import {
  CollectionEditDialog,
  type EditableCollection,
} from "@/components/collections/collection-edit-dialog"
import { CollectionDeleteDialog } from "@/components/collections/collection-delete-dialog"

export interface CollectionDialogsState {
  editOpen: boolean
  deleteOpen: boolean
  setEditOpen: (open: boolean) => void
  setDeleteOpen: (open: boolean) => void
  openEdit: () => void
  openDelete: () => void
}

/**
 * Open state for a collection's edit and delete dialogs. Both surfaces that
 * offer these actions — the card's 3-dots menu and the detail page header —
 * held the same pair of `useState` flags and mounted the same pair of dialogs.
 */
export function useCollectionDialogs(): CollectionDialogsState {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return {
    editOpen,
    deleteOpen,
    setEditOpen,
    setDeleteOpen,
    openEdit: () => setEditOpen(true),
    openDelete: () => setDeleteOpen(true),
  }
}

/**
 * The edit + delete dialogs for one collection, driven by `useCollectionDialogs`.
 * `onDeleted` is forwarded to the delete dialog, which falls back to
 * `router.refresh()` when it is omitted.
 */
export function CollectionDialogs({
  collection,
  state,
  onDeleted,
}: {
  collection: EditableCollection
  state: CollectionDialogsState
  onDeleted?: () => void
}) {
  return (
    <>
      <CollectionEditDialog
        collection={collection}
        open={state.editOpen}
        onOpenChange={state.setEditOpen}
      />
      <CollectionDeleteDialog
        collection={{ id: collection.id, name: collection.name }}
        open={state.deleteOpen}
        onOpenChange={state.setDeleteOpen}
        onDeleted={onDeleted}
      />
    </>
  )
}
