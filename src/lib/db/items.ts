import { prisma } from "@/lib/prisma"
import type { ContentType, Item, ItemType, Tag } from "@/generated/prisma/client"

export type ItemWithType = Item & {
  itemType: ItemType
  tags: Tag[]
}

/**
 * Full item detail served over the `/api/items/[id]` route. Dates are
 * serialized to ISO strings so the shape survives JSON transport unchanged.
 */
export type ItemDetail = {
  id: string
  title: string
  description: string | null
  contentType: ContentType
  content: string | null
  url: string | null
  fileName: string | null
  fileSize: number | null
  language: string | null
  isFavorite: boolean
  isPinned: boolean
  updatedAt: string
  itemType: { name: string; icon: string; color: string }
  tags: { id: string; name: string }[]
  collections: { id: string; name: string }[]
}

export async function getPinnedItems(userId: string): Promise<ItemWithType[]> {
  return prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: { updatedAt: "desc" },
    include: { itemType: true, tags: { orderBy: { name: "asc" } } },
  })
}

export async function getRecentItems(userId: string, limit = 10): Promise<ItemWithType[]> {
  return prisma.item.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { itemType: true, tags: { orderBy: { name: "asc" } } },
  })
}

export async function getItemTypeByName(name: string): Promise<ItemType | null> {
  return prisma.itemType.findFirst({ where: { name, isSystem: true } })
}

export async function getItemsByType(userId: string, typeName: string): Promise<ItemWithType[]> {
  return prisma.item.findMany({
    where: { userId, itemType: { name: typeName } },
    orderBy: { updatedAt: "desc" },
    include: { itemType: true, tags: { orderBy: { name: "asc" } } },
  })
}

// Shape returned by the detail queries below (base item + the relations we include).
type ItemDetailRow = Item & {
  itemType: ItemType
  tags: Tag[]
  collections: { collection: { id: string; name: string } }[]
}

// Relations to include so a row can be mapped to `ItemDetail`.
const itemDetailInclude = {
  itemType: true,
  tags: { orderBy: { name: "asc" } },
  collections: { include: { collection: true } },
} as const

function toItemDetail(item: ItemDetailRow): ItemDetail {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    contentType: item.contentType,
    content: item.content,
    url: item.url,
    fileName: item.fileName,
    fileSize: item.fileSize,
    language: item.language,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    updatedAt: item.updatedAt.toISOString(),
    itemType: { name: item.itemType.name, icon: item.itemType.icon, color: item.itemType.color },
    tags: item.tags.map((tag) => ({ id: tag.id, name: tag.name })),
    collections: item.collections.map((ic) => ({ id: ic.collection.id, name: ic.collection.name })),
  }
}

/**
 * Fetch a single item's full detail, scoped to its owner. Returns `null` when
 * the item does not exist or does not belong to `userId` (both look identical
 * to the caller so ownership is never leaked).
 */
export async function getItemDetail(userId: string, itemId: string): Promise<ItemDetail | null> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, userId },
    include: itemDetailInclude,
  })

  if (!item) return null

  return toItemDetail(item)
}

export interface UpdateItemData {
  title: string
  description: string | null
  content: string | null
  url: string | null
  language: string | null
  tags: string[]
}

/**
 * Update an item's editable fields, scoped to its owner. Ownership is verified
 * first (the `update` where-clause can only target the unique `id`), so a user
 * can never mutate another user's item. Tags are fully replaced: existing links
 * are cleared and the new set is connect-or-created under the same user.
 * Returns the refreshed `ItemDetail`, or `null` if the item isn't owned/found.
 */
export async function updateItem(
  userId: string,
  itemId: string,
  data: UpdateItemData
): Promise<ItemDetail | null> {
  const existing = await prisma.item.findFirst({
    where: { id: itemId, userId },
    select: { id: true },
  })
  if (!existing) return null

  const item = await prisma.item.update({
    where: { id: itemId },
    data: {
      title: data.title,
      description: data.description,
      content: data.content,
      url: data.url,
      language: data.language,
      tags: {
        set: [],
        connectOrCreate: data.tags.map((name) => ({
          where: { userId_name: { userId, name } },
          create: { name, userId },
        })),
      },
    },
    include: itemDetailInclude,
  })

  return toItemDetail(item)
}

/**
 * Delete an item, scoped to its owner. Ownership is verified first (the
 * `delete` where-clause can only target the unique `id`), so a user can never
 * delete another user's item. Cascade rules clear the `ItemCollection` join
 * rows and the implicit Tag<->Item links; the tags themselves are left intact.
 * Returns `true` if an item was deleted, `false` if it isn't owned/found.
 */
export async function deleteItem(userId: string, itemId: string): Promise<boolean> {
  const existing = await prisma.item.findFirst({
    where: { id: itemId, userId },
    select: { id: true },
  })
  if (!existing) return false

  await prisma.item.delete({ where: { id: itemId } })
  return true
}
