"use client"

import { useRouter } from "next/navigation"
import { Pencil, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { EditableCollection } from "@/components/collections/collection-edit-dialog"
import {
  CollectionDialogs,
  useCollectionDialogs,
} from "@/components/collections/collection-dialogs"
import { toggleCollectionFavorite } from "@/actions/collections"
import { useFavoriteToggle } from "@/lib/use-favorite-toggle"
import { cn } from "@/lib/utils"

/**
 * Edit / Favorite / Delete controls for the collection detail page header.
 * Deleting navigates back to `/collections` since the current page no longer
 * exists after the collection is gone.
 *
 * The star here is a toolbar `Button`, not the hover-revealed
 * `FavoriteStarButton` the cards use — a different control, deliberately.
 */
export function CollectionDetailActions({
  collection,
  isFavorite: initialFavorite,
}: {
  collection: EditableCollection
  isFavorite: boolean
}) {
  const router = useRouter()
  const dialogs = useCollectionDialogs()
  const { isFavorite, isPending, toggle } = useFavoriteToggle(
    collection.id,
    initialFavorite,
    toggleCollectionFavorite
  )

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={dialogs.openEdit}>
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={toggle}
          disabled={isPending}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star className={cn("h-4 w-4", isFavorite && "fill-amber-400 text-amber-400")} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive"
          onClick={dialogs.openDelete}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Delete</span>
        </Button>
      </div>

      <CollectionDialogs
        collection={collection}
        state={dialogs}
        onDeleted={() => router.push("/collections")}
      />
    </>
  )
}
