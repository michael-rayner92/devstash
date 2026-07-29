"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type ToggleFavoriteAction = (
  id: string
) => Promise<
  | { success: true; data: { isFavorite: boolean } }
  | { success: false; error: string }
>

interface UseFavoriteToggle {
  isFavorite: boolean
  isPending: boolean
  toggle: () => void
}

/**
 * Client-side favorite toggle shared by item and collection favorite controls.
 * Updates optimistically, persists via `action`, then reconciles with the
 * server value and calls `router.refresh()` so dependent server-rendered views
 * (cards, sidebar Favourites, dashboard stat, `/favorites`) stay in sync. On
 * failure it rolls back and surfaces the error via a toast. `onToggled` fires
 * with the confirmed value on success (e.g. to sync the drawer's detail).
 */
export function useFavoriteToggle(
  id: string,
  initial: boolean,
  action: ToggleFavoriteAction,
  onToggled?: (isFavorite: boolean) => void
): UseFavoriteToggle {
  const router = useRouter()
  const [isFavorite, setIsFavorite] = useState(initial)
  const [prevInitial, setPrevInitial] = useState(initial)
  const [isPending, startTransition] = useTransition()

  // Reconcile with the server value when it changes underneath us — e.g. the
  // same item toggled from another surface, then `router.refresh()` feeds a new
  // `initial` down. Done during render (React's "adjust state on prop change"
  // pattern) rather than in an effect. The optimistic value set below is never
  // clobbered: `initial` only changes after the refresh reflects our own write.
  if (initial !== prevInitial) {
    setPrevInitial(initial)
    setIsFavorite(initial)
  }

  function toggle() {
    const next = !isFavorite
    setIsFavorite(next) // optimistic
    startTransition(async () => {
      const result = await action(id)
      if (result.success) {
        setIsFavorite(result.data.isFavorite)
        onToggled?.(result.data.isFavorite)
        router.refresh()
      } else {
        setIsFavorite(!next) // roll back
        toast.error(result.error)
      }
    })
  }

  return { isFavorite, isPending, toggle }
}
