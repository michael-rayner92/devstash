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
    include: { itemType: true, tags: true },
  })
}

export async function getRecentItems(userId: string, limit = 10): Promise<ItemWithType[]> {
  return prisma.item.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { itemType: true, tags: true },
  })
}

export async function getItemTypeByName(name: string): Promise<ItemType | null> {
  return prisma.itemType.findFirst({ where: { name, isSystem: true } })
}

export async function getItemsByType(userId: string, typeName: string): Promise<ItemWithType[]> {
  return prisma.item.findMany({
    where: { userId, itemType: { name: typeName } },
    orderBy: { updatedAt: "desc" },
    include: { itemType: true, tags: true },
  })
}

/**
 * Fetch a single item's full detail, scoped to its owner. Returns `null` when
 * the item does not exist or does not belong to `userId` (both look identical
 * to the caller so ownership is never leaked).
 */
export async function getItemDetail(userId: string, itemId: string): Promise<ItemDetail | null> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, userId },
    include: {
      itemType: true,
      tags: { orderBy: { name: "asc" } },
      collections: { include: { collection: true } },
    },
  })

  if (!item) return null

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
