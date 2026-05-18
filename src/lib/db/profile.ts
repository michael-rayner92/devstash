import { prisma } from "@/lib/prisma"

export type ItemTypeCount = {
  id: string
  name: string
  icon: string
  color: string
  count: number
}

export type ProfileData = {
  id: string
  name: string | null
  email: string
  image: string | null
  hasPassword: boolean
  createdAt: Date
  totalItems: number
  totalCollections: number
  itemTypeCounts: ItemTypeCount[]
}

export async function getProfileData(userId: string): Promise<ProfileData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      password: true,
      createdAt: true,
    },
  })

  if (!user) return null

  const [totalItems, totalCollections, itemTypeCounts] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
    prisma.item.groupBy({
      by: ["itemTypeId"],
      where: { userId },
      _count: { id: true },
    }),
  ])

  const typeIds = itemTypeCounts.map((r) => r.itemTypeId)
  const itemTypes = typeIds.length
    ? await prisma.itemType.findMany({ where: { id: { in: typeIds } } })
    : []

  const typeMap = new Map(itemTypes.map((t) => [t.id, t]))

  const typeCounts: ItemTypeCount[] = itemTypeCounts
    .map((r) => {
      const type = typeMap.get(r.itemTypeId)
      if (!type) return null
      return {
        id: type.id,
        name: type.name,
        icon: type.icon,
        color: type.color,
        count: r._count.id,
      }
    })
    .filter((t): t is ItemTypeCount => t !== null)
    .sort((a, b) => b.count - a.count)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    hasPassword: !!user.password,
    createdAt: user.createdAt,
    totalItems,
    totalCollections,
    itemTypeCounts: typeCounts,
  }
}
