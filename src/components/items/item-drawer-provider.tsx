"use client"

import type { KeyboardEvent, ReactNode } from "react"
import { createContext, useCallback, useContext, useRef, useState } from "react"
import type { ItemDetail } from "@/lib/db/items"
import { ItemDrawer } from "./item-drawer"

interface ItemDrawerContextValue {
  openItem: (id: string) => void
}

const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(null)

export function useItemDrawer(): ItemDrawerContextValue {
  const ctx = useContext(ItemDrawerContext)
  if (!ctx) {
    throw new Error("useItemDrawer must be used within an ItemDrawerProvider")
  }
  return ctx
}

/**
 * Props that turn any element into a trigger that opens the item drawer:
 * click, plus Enter/Space for keyboard users, with the button role and focus
 * order to match. Shared by every surface that lists items — `ItemCard`,
 * `ImageCard`, `FileListRow`, `ItemRow` and `FavoriteItemRow` each carried an
 * identical copy of this block.
 *
 * Lives here rather than in `src/lib/` because it depends on the drawer
 * context, and a lib module shouldn't import from `src/components/`.
 */
export function useItemTriggerProps(itemId: string) {
  const { openItem } = useItemDrawer()

  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: () => openItem(itemId),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        openItem(itemId)
      }
    },
  }
}

interface DrawerState {
  open: boolean
  loading: boolean
  detail: ItemDetail | null
  error: boolean
}

const CLOSED: DrawerState = { open: false, loading: false, detail: null, error: false }

interface ItemDrawerProviderProps {
  children: ReactNode
  /**
   * Whether AI features are available to this user, computed on the server and
   * threaded down to the drawer's edit form. `BILLING_ENFORCED` is not exposed
   * to the browser, so the check can't be repeated client-side.
   */
  canUseAi: boolean
}

export function ItemDrawerProvider({ children, canUseAi }: ItemDrawerProviderProps) {
  const [state, setState] = useState<DrawerState>(CLOSED)
  // Tracks the latest request so a slow response for a previously-clicked item
  // can't overwrite the drawer after the user has clicked a different one.
  const requestId = useRef(0)

  const openItem = useCallback(async (id: string) => {
    const rid = ++requestId.current
    setState({ open: true, loading: true, detail: null, error: false })

    try {
      const res = await fetch(`/api/items/${id}`)
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const detail: ItemDetail = await res.json()
      if (rid === requestId.current) {
        setState({ open: true, loading: false, detail, error: false })
      }
    } catch {
      if (rid === requestId.current) {
        setState({ open: true, loading: false, detail: null, error: true })
      }
    }
  }, [])

  const onOpenChange = useCallback((open: boolean) => {
    if (!open) requestId.current++ // invalidate any in-flight fetch on close
    setState((prev) => ({ ...prev, open }))
  }, [])

  // Replace the drawer's detail after an in-drawer edit saves, so view mode
  // reflects the change without a second fetch.
  const onUpdated = useCallback((detail: ItemDetail) => {
    setState((prev) => ({ ...prev, detail }))
  }, [])

  // Close the drawer after a delete succeeds and invalidate any in-flight fetch.
  const onDeleted = useCallback(() => {
    requestId.current++
    setState(CLOSED)
  }, [])

  return (
    <ItemDrawerContext.Provider value={{ openItem }}>
      {children}
      <ItemDrawer
        open={state.open}
        loading={state.loading}
        detail={state.detail}
        error={state.error}
        canUseAi={canUseAi}
        onOpenChange={onOpenChange}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
      />
    </ItemDrawerContext.Provider>
  )
}
