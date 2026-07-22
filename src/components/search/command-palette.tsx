"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { File, Folder } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useItemDrawer } from "@/components/items/item-drawer-provider"
import { iconMap } from "@/lib/icon-map"
import type { SearchIndex } from "@/lib/db/search"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Cmd/Ctrl+K command palette. Fuzzy-searches the user's items and collections
 * entirely client-side over a dataset fetched from `/api/search`. The dataset
 * is (re)fetched every time the palette opens, so it reflects recent
 * create/edit/delete activity without paying a per-keystroke round-trip.
 * Selecting an item opens the item drawer; selecting a collection navigates to
 * its page.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const { openItem } = useItemDrawer()
  const [data, setData] = useState<SearchIndex | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    fetch("/api/search")
      .then((res) => {
        if (!res.ok) throw new Error("Request failed")
        return res.json()
      })
      .then((index: SearchIndex) => {
        if (active) {
          setData(index)
          setFailed(false)
        }
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [open])

  // Close the palette before acting so its focus trap tears down cleanly before
  // the drawer opens / navigation runs.
  function handleSelectItem(id: string) {
    onOpenChange(false)
    openItem(id)
  }

  function handleSelectCollection(id: string) {
    onOpenChange(false)
    router.push(`/collections/${id}`)
  }

  const loading = data === null && !failed

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search items and collections..." />
      <CommandList>
        {loading && (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
        )}
        {failed && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Couldn&apos;t load search data.
          </div>
        )}
        {data && (
          <>
            <CommandEmpty>No results found.</CommandEmpty>

            {data.items.length > 0 && (
              <CommandGroup heading="Items">
                {data.items.map((item) => {
                  const Icon = iconMap[item.type.icon] ?? File
                  return (
                    <CommandItem
                      key={item.id}
                      // Value holds only human text (title + type + preview) so
                      // fuzzy matching never scores against the cuid id.
                      value={`${item.title} ${item.type.name} ${item.preview}`}
                      onSelect={() => handleSelectItem(item.id)}
                    >
                      <Icon className="h-4 w-4 shrink-0" style={{ color: item.type.color }} />
                      <span className="truncate">{item.title}</span>
                      <span className="ml-auto shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                        {item.type.name}
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            {data.collections.length > 0 && (
              <CommandGroup heading="Collections">
                {data.collections.map((collection) => (
                  <CommandItem
                    key={collection.id}
                    value={collection.name}
                    onSelect={() => handleSelectCollection(collection.id)}
                  >
                    <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{collection.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
