import { prisma } from "@/lib/prisma"
import { computeDominantType } from "@/lib/db/dominant-type"
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
