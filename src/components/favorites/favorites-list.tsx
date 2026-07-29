"use client"

import { useMemo, useState } from "react"
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react"
import {
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_KEY,
  SORT_KEYS,
  sortFavoriteCollections,
  sortFavoriteItems,
  type FavoriteSortKey,
  type SortDirection,
} from "@/lib/sort-favorites"
import { FavoriteItemRow } from "@/components/favorites/favorite-item-row"
import { FavoriteCollectionRow } from "@/components/favorites/favorite-collection-row"
import type { FavoriteCollection, FavoriteItem } from "@/lib/db/favorites"

const selectClassName =
  "h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

/**
 * Client wrapper for the favorites page: owns the (client-side) sort state and
 * re-orders both the Items and Collections sections in the browser — no server
 * round-trip. The page stays a server component that fetches and passes data in.
 */
export function FavoritesList({
  items,
  collections,
}: {
  items: FavoriteItem[]
  collections: FavoriteCollection[]
}) {
  const [sortKey, setSortKey] = useState<FavoriteSortKey>(DEFAULT_SORT_KEY)
  const [direction, setDirection] = useState<SortDirection>(DEFAULT_SORT_DIRECTION)

  const sortedItems = useMemo(
    () => sortFavoriteItems(items, sortKey, direction),
    [items, sortKey, direction]
  )
  const sortedCollections = useMemo(
    () => sortFavoriteCollections(collections, sortKey, direction),
    [collections, sortKey, direction]
  )

  const DirectionIcon = direction === "asc" ? ArrowUpNarrowWide : ArrowDownWideNarrow

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end gap-2">
        <label htmlFor="favorites-sort" className="text-xs font-medium text-muted-foreground">
          Sort by
        </label>
        <select
          id="favorites-sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as FavoriteSortKey)}
          className={selectClassName}
        >
          {SORT_KEYS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setDirection((d) => (d === "asc" ? "desc" : "asc"))}
          aria-label={
            direction === "asc"
              ? "Sorted ascending, switch to descending"
              : "Sorted descending, switch to ascending"
          }
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-transparent text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <DirectionIcon className="h-4 w-4" />
        </button>
      </div>

      {sortedItems.length > 0 && (
        <section>
          <h2 className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Items ({sortedItems.length})
          </h2>
          <div className="divide-y divide-border/50 border-y border-border/50">
            {sortedItems.map((item) => (
              <FavoriteItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {sortedCollections.length > 0 && (
        <section>
          <h2 className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Collections ({sortedCollections.length})
          </h2>
          <div className="divide-y divide-border/50 border-y border-border/50">
            {sortedCollections.map((collection) => (
              <FavoriteCollectionRow key={collection.id} collection={collection} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
