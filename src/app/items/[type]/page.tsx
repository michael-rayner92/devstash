import { notFound } from "next/navigation"
import { File } from "lucide-react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getItemTypeByName, getItemsByType } from "@/lib/db/items"
import { iconMap } from "@/lib/icon-map"
import { ItemCard } from "@/components/items/item-card"

export default async function ItemsByTypePage({
  params,
}: {
  params: Promise<{ type: string }>
}) {
  const { type: typeParam } = await params
  const typeName = typeParam.replace(/s$/, "")

  const itemType = await getItemTypeByName(typeName)
  if (!itemType) notFound()

  const session = await auth()
  const userId = session?.user?.id
  const dbUser = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null

  const items = dbUser ? await getItemsByType(dbUser.id, typeName) : []
  const Icon = iconMap[itemType.icon] ?? File

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl">
      <div className="flex items-center gap-3">
        <div className="rounded-lg p-2" style={{ backgroundColor: `${itemType.color}20` }}>
          <Icon className="h-5 w-5" style={{ color: itemType.color }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight capitalize">{itemType.name}s</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <div className="mb-4 rounded-full p-3" style={{ backgroundColor: `${itemType.color}15` }}>
            <Icon className="h-6 w-6" style={{ color: itemType.color }} />
          </div>
          <h2 className="text-sm font-medium text-foreground">No {itemType.name}s yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {itemType.name}s you stash will show up here.
          </p>
        </div>
      )}
    </div>
  )
}
