import { Library } from "lucide-react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCollections } from "@/lib/db/collections"
import { CollectionCard } from "@/components/dashboard/collection-card"

export default async function CollectionsPage() {
  const session = await auth()
  const userId = session?.user?.id
  const dbUser = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null

  const collections = dbUser ? await getCollections(dbUser.id) : []

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted p-2">
          <Library className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
          <p className="text-sm text-muted-foreground">
            {collections.length} {collections.length === 1 ? "collection" : "collections"}
          </p>
        </div>
      </div>

      {collections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <div className="mb-4 rounded-full bg-muted p-3">
            <Library className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-medium text-foreground">No collections yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use “New collection” in the top bar to group related items.
          </p>
        </div>
      )}
    </div>
  )
}
