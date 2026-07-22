import { notFound } from "next/navigation"
import { Library } from "lucide-react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCollectionWithItems } from "@/lib/db/collections"
import { parsePageParam } from "@/lib/pagination"
import { ItemCard } from "@/components/items/item-card"
import { Pagination } from "@/components/ui/pagination"
import { CollectionDetailActions } from "@/components/collections/collection-detail-actions"

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const { page: pageParam } = await searchParams

  const session = await auth()
  const userId = session?.user?.id
  const dbUser = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null
  if (!dbUser) notFound()

  const collection = await getCollectionWithItems(dbUser.id, id, parsePageParam(pageParam))
  if (!collection) notFound()

  const { items, totalCount, page, totalPages } = collection

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl">
      <div className="flex items-start justify-between gap-3">
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
              {totalCount} {totalCount === 1 ? "item" : "items"}
            </p>
          </div>
        </div>
        <CollectionDetailActions
          collection={{
            id: collection.id,
            name: collection.name,
            description: collection.description,
          }}
        />
      </div>

      {items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            basePath={`/collections/${id}`}
          />
        </>
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
