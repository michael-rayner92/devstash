"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type TogglePinAction = (
  id: string
) => Promise<
  | { success: true; data: { isPinned: boolean } }
  | { success: false; error: string }
>

interface UsePinToggle {
  isPinned: boolean
  isPending: boolean
  toggle: () => void
}

/**
 * Client-side pin toggle for the item drawer. Mirrors `useFavoriteToggle`:
 * updates optimistically, persists via `action`, then reconciles with the
 * server value and calls `router.refresh()` so dependent server-rendered views
 * (the pin indicator on cards, the dashboard pinned section, pinned-first
 * ordering on listings) stay in sync. On failure it rolls back and surfaces the
 * error via a toast. `onToggled` fires with the confirmed value on success
 * (e.g. to sync the drawer's detail).
 */
export function usePinToggle(
  id: string,
  initial: boolean,
  action: TogglePinAction,
  onToggled?: (isPinned: boolean) => void
): UsePinToggle {
  const router = useRouter()
  const [isPinned, setIsPinned] = useState(initial)
  const [prevInitial, setPrevInitial] = useState(initial)
  const [isPending, startTransition] = useTransition()

  // Reconcile with the server value when it changes underneath us — e.g. the
  // same item toggled from another surface, then `router.refresh()` feeds a new
  // `initial` down. Done during render (React's "adjust state on prop change"
  // pattern) rather than in an effect. The optimistic value set below is never
  // clobbered: `initial` only changes after the refresh reflects our own write.
  if (initial !== prevInitial) {
    setPrevInitial(initial)
    setIsPinned(initial)
  }

  function toggle() {
    const next = !isPinned
    setIsPinned(next) // optimistic
    startTransition(async () => {
      const result = await action(id)
      if (result.success) {
        setIsPinned(result.data.isPinned)
        onToggled?.(result.data.isPinned)
        router.refresh()
      } else {
        setIsPinned(!next) // roll back
        toast.error(result.error)
      }
    })
  }

  return { isPinned, isPending, toggle }
}
