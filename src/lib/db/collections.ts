import { prisma } from "@/lib/prisma"
import { computeDominantType } from "@/lib/db/dominant-type"
import type { Collection, ItemType } from "@/generated/prisma/client"
import type { ItemWithType } from "@/lib/db/items"

export type CollectionWithStats = {
  id: string
  name: string
  description: string | null
  isFavorite: boolean
  updatedAt: Date
  itemCount: number
  dominantType: ItemType | null
  allTypes: ItemType[]
}

// Relations needed to compute a collection's stats (item count + type spread).
const collectionStatsInclude = {
  items: { include: { item: { include: { itemType: true } } } },
} as const

type CollectionStatsRow = Collection & {
  items: { item: { itemType: ItemType } }[]
}

function toCollectionWithStats(col: CollectionStatsRow): CollectionWithStats {
  const { dominantType, allTypes } = computeDominantType(
    col.items.map((ic) => ic.item.itemType)
  )

  return {
    id: col.id,
    name: col.name,
    description: col.description,
    isFavorite: col.isFavorite,
    updatedAt: col.updatedAt,
    itemCount: col.items.length,
    dominantType,
    allTypes,
  }
}

export async function getRecentCollections(userId: string, limit = 6): Promise<CollectionWithStats[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: collectionStatsInclude,
  })

  return collections.map(toCollectionWithStats)
}

/** All of a user's collections (most-recently-updated first), for `/collections`. */
export async function getCollections(userId: string): Promise<CollectionWithStats[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: collectionStatsInclude,
  })

  return collections.map(toCollectionWithStats)
}

export type CollectionDetail = {
  id: string
  name: string
  description: string | null
  isFavorite: boolean
  updatedAt: Date
  items: ItemWithType[]
}

/**
 * A single collection plus its items, scoped to its owner. Items come back in
 * the `ItemWithType` shape the item cards consume, most-recently-updated first.
 * Returns `null` when the collection is missing or not owned by `userId`.
 */
export async function getCollectionWithItems(
  userId: string,
  collectionId: string
): Promise<CollectionDetail | null> {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    include: {
      items: {
        orderBy: { item: { updatedAt: "desc" } },
        include: {
          item: { include: { itemType: true, tags: { orderBy: { name: "asc" } } } },
        },
      },
    },
  })

  if (!collection) return null

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isFavorite: collection.isFavorite,
    updatedAt: collection.updatedAt,
    items: collection.items.map((ic) => ic.item),
  }
}

export type UserCollectionOption = {
  id: string
  name: string
}

/**
 * Lightweight list of the user's collections (id + name, alphabetical) for
 * populating the collection selector in the item create/edit forms.
 */
export async function getUserCollections(userId: string): Promise<UserCollectionOption[]> {
  return prisma.collection.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
}

export async function getDashboardStats(userId: string) {
  const [totalItems, totalCollections, totalFavorites] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
  ])
  return { totalItems, totalCollections, totalFavorites }
}

/**
 * A newly created collection, serialized for JSON transport (dates as ISO
 * strings), matching the `ItemDetail` serialization convention.
 */
export type CollectionSummary = {
  id: string
  name: string
  description: string | null
  isFavorite: boolean
  updatedAt: string
}

export interface CreateCollectionData {
  name: string
  description: string | null
}

/**
 * Create a new collection owned by `userId`. Returns the created collection as
 * a serializable `CollectionSummary`.
 */
export async function createCollection(
  userId: string,
  data: CreateCollectionData
): Promise<CollectionSummary> {
  const collection = await prisma.collection.create({
    data: {
      name: data.name,
      description: data.description,
      userId,
    },
  })

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isFavorite: collection.isFavorite,
    updatedAt: collection.updatedAt.toISOString(),
  }
}

export interface UpdateCollectionData {
  name: string
  description: string | null
}

/**
 * Update a collection's metadata (name + description), scoped to its owner.
 * Returns the updated collection as a serializable `CollectionSummary`, or
 * `null` if the collection isn't owned/found.
 */
export async function updateCollection(
  userId: string,
  collectionId: string,
  data: UpdateCollectionData
): Promise<CollectionSummary | null> {
  const existing = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    select: { id: true },
  })
  if (!existing) return null

  const collection = await prisma.collection.update({
    where: { id: collectionId },
    data: {
      name: data.name,
      description: data.description,
    },
  })

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isFavorite: collection.isFavorite,
    updatedAt: collection.updatedAt.toISOString(),
  }
}

/**
 * Delete a collection, scoped to its owner. Only the collection and its
 * `ItemCollection` join rows (via cascade) are removed — the items themselves
 * are preserved. Returns `true` on success, `false` if not owned/found.
 */
export async function deleteCollection(
  userId: string,
  collectionId: string
): Promise<boolean> {
  const existing = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    select: { id: true },
  })
  if (!existing) return false

  await prisma.collection.delete({ where: { id: collectionId } })
  return true
}
