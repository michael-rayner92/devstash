"use client"

import type { KeyboardEvent, MouseEvent } from "react"
import { useState } from "react"
import { MoreVertical, Pencil, Star, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CollectionEditDialog,
  type EditableCollection,
} from "@/components/collections/collection-edit-dialog"
import { CollectionDeleteDialog } from "@/components/collections/collection-delete-dialog"

/**
 * The 3-dots actions menu shown on a collection card. It stops its own clicks
 * from bubbling to the card (which navigates), and hosts the edit + delete
 * dialogs. Favorite is display-only for now (no behavior wired up yet).
 */
export function CollectionCardMenu({ collection }: { collection: EditableCollection }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // The menu and its dialogs are portalled, but React re-targets their events
  // up the *component* tree — so a click on a menu item or dialog button would
  // otherwise bubble to the card's onClick (navigation). Stop click/keydown at
  // this boundary so card interactions stay limited to the card body itself.
  function stop(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation()
  }

  return (
    <div onClick={stop} onKeyDown={stop}>
      {/* Non-modal so the menu doesn't lock body pointer-events; otherwise
          opening a Dialog from a menu item races the menu's cleanup and leaves
          `body { pointer-events: none }` behind after everything closes. */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Collection actions"
            className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted data-[state=open]:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => {}}>
            <Star />
            Favorite
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CollectionEditDialog collection={collection} open={editOpen} onOpenChange={setEditOpen} />
      <CollectionDeleteDialog
        collection={{ id: collection.id, name: collection.name }}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  )
}
