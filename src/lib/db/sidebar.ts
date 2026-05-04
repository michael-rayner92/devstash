import { prisma } from "@/lib/prisma"

const PRO_TYPE_NAMES = new Set(["file", "image"])

export type SidebarItemType = {
  id: string
  name: string
  icon: string
  color: string
  isPro: boolean
}

export type SidebarCollection = {
  id: string
  name: string
  isFavorite: boolean
  itemCount: number
  dominantColor: string | null
}

export async function getSidebarItemTypes(): Promise<SidebarItemType[]> {
  const types = await prisma.itemType.findMany({
    where: { isSystem: true },
  })
  return types.map((t) => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    color: t.color,
    isPro: PRO_TYPE_NAMES.has(t.name),
  }))
}

export async function getSidebarCollections(userId: string): Promise<SidebarCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
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
    const typeCounts = new Map<string, { color: string; count: number }>()
    for (const ic of col.items) {
      const { id, color } = ic.item.itemType
      const entry = typeCounts.get(id)
      if (entry) entry.count++
      else typeCounts.set(id, { color, count: 1 })
    }

    let dominantColor: string | null = null
    let maxCount = 0
    for (const { color, count } of typeCounts.values()) {
      if (count > maxCount) {
        dominantColor = color
        maxCount = count
      }
    }

    return {
      id: col.id,
      name: col.name,
      isFavorite: col.isFavorite,
      itemCount: col.items.length,
      dominantColor,
    }
  })
}
