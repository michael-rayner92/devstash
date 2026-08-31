"use client"

import type { KeyboardEvent, MouseEvent } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface FavoriteStarButtonProps {
  isFavorite: boolean
  isPending: boolean
  onToggle: () => void
  /** Star size: "sm" (14px) on item surfaces, "md" (16px) on collection cards. */
  size?: "sm" | "md"
  className?: string
}

/**
 * Hover-revealed star toggle: filled amber at full opacity when favorited,
 * muted and revealed on hover or focus otherwise — matching the cards' copy
 * button. Stops click *and* keydown from bubbling, so it never also triggers
 * the surrounding card's own activation handler.
 *
 * The collection card's copy of this used `yellow-400` where every other
 * favorite control in the app uses `amber-400`; unified here on amber rather
 * than adding a fill-color prop, which would have preserved the very
 * inconsistency the shared component exists to remove.
 *
 * Not used by `CollectionDetailActions`: that star is an `outline` Button in a
 * page-header toolbar, not an overlay, so it is a different control.
 */
export function FavoriteStarButton({
  isFavorite,
  isPending,
  onToggle,
  size = "sm",
  className,
}: FavoriteStarButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onToggle()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    // Keep Enter/Space from bubbling to the card; the button's own activation
    // still fires its onClick.
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
        // p-1.5 lifts the icon to a 26-28px hit area, over the WCAG 2.5.8
        // 24x24 floor.
        "rounded-md p-1.5 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        className
      )}
    >
      <Star
        className={cn(
          size === "md" ? "h-4 w-4" : "h-3.5 w-3.5",
          isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/60"
        )}
      />
    </button>
  )
}
