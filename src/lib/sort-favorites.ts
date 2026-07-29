import type { FavoriteCollection, FavoriteItem } from "@/lib/db/favorites"

export type FavoriteSortKey = "name" | "date" | "type"
export type SortDirection = "asc" | "desc"

/** Sort keys offered by the favorites sort control, in display order. */
export const SORT_KEYS: { value: FavoriteSortKey; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "name", label: "Name" },
  { value: "type", label: "Type" },
]

/** Initial sort — most-recently-updated first, matching the prior DB ordering. */
export const DEFAULT_SORT_KEY: FavoriteSortKey = "date"
export const DEFAULT_SORT_DIRECTION: SortDirection = "desc"

// Case-insensitive, locale-aware string compare.
function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" })
}

// Flip the comparison for descending order.
function withDirection(result: number, direction: SortDirection): number {
  return direction === "asc" ? result : -result
}

/**
 * Sort favorited items by the given key + direction, returning a new array
 * (never mutates the input). Ties break deterministically by title then id
 * (direction-independent) so equal keys never reshuffle between renders.
 */
export function sortFavoriteItems(
  items: FavoriteItem[],
  key: FavoriteSortKey,
  direction: SortDirection
): FavoriteItem[] {
  return [...items].sort((a, b) => {
    let primary: number
    if (key === "name") primary = compareStrings(a.title, b.title)
    else if (key === "type") primary = compareStrings(a.itemType.name, b.itemType.name)
    else primary = a.updatedAt.getTime() - b.updatedAt.getTime()

    if (primary !== 0) return withDirection(primary, direction)

    const byTitle = compareStrings(a.title, b.title)
    return byTitle !== 0 ? byTitle : compareStrings(a.id, b.id)
  })
}

/**
 * Sort favorited collections by the given key + direction, returning a new
 * array. Collections have no item type, so the "type" key falls back to sorting
 * by name. Ties break deterministically by name then id.
 */
export function sortFavoriteCollections(
  collections: FavoriteCollection[],
  key: FavoriteSortKey,
  direction: SortDirection
): FavoriteCollection[] {
  return [...collections].sort((a, b) => {
    // "type" has no meaning for collections → fall back to name.
    const primary =
      key === "date" ? a.updatedAt.getTime() - b.updatedAt.getTime() : compareStrings(a.name, b.name)

    if (primary !== 0) return withDirection(primary, direction)

    const byName = compareStrings(a.name, b.name)
    return byName !== 0 ? byName : compareStrings(a.id, b.id)
  })
}
