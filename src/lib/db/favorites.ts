import { prisma } from "@/lib/prisma"

/**
 * A favorited item, trimmed to just what the compact favorites list renders
 * (type icon/badge, title, date). Dates are kept as `Date` since this crosses
 * only the server-page → client-row-component boundary, not a JSON API.
 */
export type FavoriteItem = {
  id: string
  title: string
  updatedAt: Date
  itemType: { name: string; icon: string; color: string }
}

/**
 * A favorited collection, trimmed to the compact list's needs (name, item
 * count, date).
 */
export type FavoriteCollection = {
  id: string
  name: string
  updatedAt: Date
  itemCount: number
}

export type Favorites = {
  items: FavoriteItem[]
  collections: FavoriteCollection[]
}

/**
 * Fetch a user's favorited items, most-recently-favorited first (`updatedAt`
 * desc). Purpose-built lightweight `select` — only the fields the row renders,
 * not full item bodies.
 */
export async function getFavoriteItems(userId: string): Promise<FavoriteItem[]> {
  return prisma.item.findMany({
    where: { userId, isFavorite: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      itemType: { select: { name: true, icon: true, color: true } },
    },
  })
}

/**
 * Fetch a user's favorited collections, most-recently-favorited first
 * (`updatedAt` desc), with each collection's item count via `_count`.
 */
export async function getFavoriteCollections(userId: string): Promise<FavoriteCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId, isFavorite: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      _count: { select: { items: true } },
    },
  })

  return collections.map((c) => ({
    id: c.id,
    name: c.name,
    updatedAt: c.updatedAt,
    itemCount: c._count.items,
  }))
}

/** Fetch all of a user's favorited items and collections in parallel. */
export async function getFavorites(userId: string): Promise<Favorites> {
  const [items, collections] = await Promise.all([
    getFavoriteItems(userId),
    getFavoriteCollections(userId),
  ])
  return { items, collections }
}
