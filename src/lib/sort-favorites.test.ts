import { describe, expect, it } from "vitest"
import {
  sortFavoriteCollections,
  sortFavoriteItems,
  type FavoriteSortKey,
  type SortDirection,
} from "@/lib/sort-favorites"
import type { FavoriteCollection, FavoriteItem } from "@/lib/db/favorites"

function item(overrides: Partial<FavoriteItem> & { id: string }): FavoriteItem {
  return {
    id: overrides.id,
    title: overrides.title ?? "Untitled",
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T00:00:00.000Z"),
    itemType: overrides.itemType ?? { name: "snippet", icon: "Code", color: "#000" },
  }
}

function collection(
  overrides: Partial<FavoriteCollection> & { id: string }
): FavoriteCollection {
  return {
    id: overrides.id,
    name: overrides.name ?? "Untitled",
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T00:00:00.000Z"),
    itemCount: overrides.itemCount ?? 0,
  }
}

const ids = (list: { id: string }[]) => list.map((x) => x.id)

describe("sortFavoriteItems", () => {
  const a = item({ id: "a", title: "Beta", itemType: { name: "prompt", icon: "", color: "" }, updatedAt: new Date("2026-03-01") })
  const b = item({ id: "b", title: "alpha", itemType: { name: "snippet", icon: "", color: "" }, updatedAt: new Date("2026-01-01") })
  const c = item({ id: "c", title: "Gamma", itemType: { name: "command", icon: "", color: "" }, updatedAt: new Date("2026-02-01") })
  const list = [a, b, c]

  it("sorts by name ascending, case-insensitive", () => {
    expect(ids(sortFavoriteItems(list, "name", "asc"))).toEqual(["b", "a", "c"]) // alpha, Beta, Gamma
  })

  it("sorts by name descending", () => {
    expect(ids(sortFavoriteItems(list, "name", "desc"))).toEqual(["c", "a", "b"])
  })

  it("sorts by date ascending (oldest first) and descending (newest first)", () => {
    expect(ids(sortFavoriteItems(list, "date", "asc"))).toEqual(["b", "c", "a"])
    expect(ids(sortFavoriteItems(list, "date", "desc"))).toEqual(["a", "c", "b"])
  })

  it("sorts by item type name", () => {
    // command, prompt, snippet
    expect(ids(sortFavoriteItems(list, "type", "asc"))).toEqual(["c", "a", "b"])
  })

  it("does not mutate the input array", () => {
    const original = [...list]
    sortFavoriteItems(list, "name", "asc")
    expect(list).toEqual(original)
  })

  it("breaks ties deterministically by title then id (same type)", () => {
    const x = item({ id: "x", title: "Same", itemType: { name: "note", icon: "", color: "" } })
    const y = item({ id: "y", title: "Same", itemType: { name: "note", icon: "", color: "" } })
    // Equal type + equal title → tie-break by id (direction-independent), so
    // ascending and descending agree on the tie order.
    expect(ids(sortFavoriteItems([y, x], "type", "asc"))).toEqual(["x", "y"])
    expect(ids(sortFavoriteItems([y, x], "type", "desc"))).toEqual(["x", "y"])
  })
})

describe("sortFavoriteCollections", () => {
  const a = collection({ id: "a", name: "Beta", updatedAt: new Date("2026-03-01") })
  const b = collection({ id: "b", name: "alpha", updatedAt: new Date("2026-01-01") })
  const c = collection({ id: "c", name: "Gamma", updatedAt: new Date("2026-02-01") })
  const list = [a, b, c]

  it("sorts by name ascending, case-insensitive", () => {
    expect(ids(sortFavoriteCollections(list, "name", "asc"))).toEqual(["b", "a", "c"])
  })

  it("sorts by date descending (newest first)", () => {
    expect(ids(sortFavoriteCollections(list, "date", "desc"))).toEqual(["a", "c", "b"])
  })

  it("falls back to name when key is 'type' (collections have no type)", () => {
    const key: FavoriteSortKey = "type"
    const dir: SortDirection = "asc"
    expect(ids(sortFavoriteCollections(list, key, dir))).toEqual(
      ids(sortFavoriteCollections(list, "name", "asc"))
    )
  })

  it("does not mutate the input array", () => {
    const original = [...list]
    sortFavoriteCollections(list, "date", "desc")
    expect(list).toEqual(original)
  })
})
