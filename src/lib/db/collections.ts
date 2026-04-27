import { prisma } from "@/lib/prisma"
import type { ItemType } from "@/generated/prisma/client"

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

export async function getRecentCollections(userId: string, limit = 6): Promise<CollectionWithStats[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      items: {
        include: {
          item: {
            include: { itemType: true },
          },
        },
      },
    },
  })

  return collections.map((col) => {
    const typeCounts = new Map<string, { type: ItemType; count: number }>()

    for (const ic of col.items) {
      const itemType = ic.item.itemType
      const entry = typeCounts.get(itemType.id)
      if (entry) {
        entry.count++
      } else {
        typeCounts.set(itemType.id, { type: itemType, count: 1 })
      }
    }

    let dominantType: ItemType | null = null
    let maxCount = 0
    for (const { type, count } of typeCounts.values()) {
      if (count > maxCount) {
        dominantType = type
        maxCount = count
      }
    }

    return {
      id: col.id,
      name: col.name,
      description: col.description,
      isFavorite: col.isFavorite,
      updatedAt: col.updatedAt,
      itemCount: col.items.length,
      dominantType,
      allTypes: Array.from(typeCounts.values()).map((v) => v.type),
    }
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
