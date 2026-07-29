"use client"

import type { KeyboardEvent, MouseEvent } from "react"
import { Star } from "lucide-react"
import { toggleItemFavorite } from "@/actions/items"
import { useFavoriteToggle } from "@/lib/use-favorite-toggle"
import { cn } from "@/lib/utils"

/**
 * Star toggle for item cards (ItemCard / ImageCard / FileListRow). Always
 * rendered: filled amber when favorited (full opacity), muted and revealed on
 * hover/focus otherwise — matching the cards' copy-button reveal pattern. Stops
 * click/keydown from bubbling so it never triggers the card's drawer-open
 * handler.
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

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    toggle()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    // Keep Enter/Space from bubbling to the card (which opens the drawer); the
    // button's own activation still fires its onClick.
    if (event.key === "Enter" || event.key === " ") {
      event.stopPropagation()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={isPending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none",
        isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        className
      )}
    >
      <Star
        className={cn(
          "h-3.5 w-3.5",
          isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/60"
        )}
      />
    </button>
  )
}
