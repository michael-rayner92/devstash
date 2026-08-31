"use client"

import { FavoriteStarButton } from "@/components/ui/favorite-star-button"
import { toggleItemFavorite } from "@/actions/items"
import { useFavoriteToggle } from "@/lib/use-favorite-toggle"
import { cn } from "@/lib/utils"

/**
 * Star toggle for item cards (ItemCard / ImageCard / FileListRow) — wires the
 * shared `FavoriteStarButton` to the item favorite action.
 */
export function ItemFavoriteButton({
  itemId,
  isFavorite: initial,
  className,
}: {
  itemId: string
  isFavorite: boolean
  className?: string
}) {
  const { isFavorite, isPending, toggle } = useFavoriteToggle(
    itemId,
    initial,
    toggleItemFavorite
  )

  return (
    <FavoriteStarButton
      isFavorite={isFavorite}
      isPending={isPending}
      onToggle={toggle}
      // -m-1.5 keeps the enlarged hit area from changing the card's layout.
      className={cn("-m-1.5", className)}
    />
  )
}
