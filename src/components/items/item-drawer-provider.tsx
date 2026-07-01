"use client"

import type { ReactNode } from "react"
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

interface DrawerState {
  open: boolean
  loading: boolean
  detail: ItemDetail | null
  error: boolean
}

const CLOSED: DrawerState = { open: false, loading: false, detail: null, error: false }

export function ItemDrawerProvider({ children }: { children: ReactNode }) {
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

  return (
    <ItemDrawerContext.Provider value={{ openItem }}>
      {children}
      <ItemDrawer
        open={state.open}
        loading={state.loading}
        detail={state.detail}
        error={state.error}
        onOpenChange={onOpenChange}
      />
    </ItemDrawerContext.Provider>
  )
}
