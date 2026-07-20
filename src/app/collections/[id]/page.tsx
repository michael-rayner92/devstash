import { notFound } from "next/navigation"
import { Library } from "lucide-react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCollectionWithItems } from "@/lib/db/collections"
import { ItemCard } from "@/components/items/item-card"

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const session = await auth()
  const userId = session?.user?.id
  const dbUser = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null
  if (!dbUser) notFound()

  const collection = await getCollectionWithItems(dbUser.id, id)
  if (!collection) notFound()

  const { items } = collection

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2">
          <Library className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{collection.name}</h1>
          {collection.description && (
            <p className="mt-1 text-sm text-muted-foreground">{collection.description}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <div className="mb-4 rounded-full bg-muted p-3">
            <Library className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-medium text-foreground">This collection is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add items to it from an item&apos;s Collections field when creating or editing.
          </p>
        </div>
      )}
    </div>
  )
}
