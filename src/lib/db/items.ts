import { prisma } from "@/lib/prisma"
import type { Item, ItemType, Tag } from "@/generated/prisma/client"

export type ItemWithType = Item & {
  itemType: ItemType
  tags: Tag[]
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
