import { Star } from "lucide-react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getFavorites } from "@/lib/db/favorites"
import { FavoritesList } from "@/components/favorites/favorites-list"

export default async function FavoritesPage() {
  const session = await auth()
  const userId = session?.user?.id
  const dbUser = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null

  const { items, collections } = dbUser
    ? await getFavorites(dbUser.id)
    : { items: [], collections: [] }

  const isEmpty = items.length === 0 && collections.length === 0

  return (
    <div className="p-6 space-y-8 max-w-screen-lg">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-amber-400/15 p-2">
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Favorites</h1>
          <p className="text-sm text-muted-foreground">
            Your starred items and collections.
          </p>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <div className="mb-4 rounded-full bg-amber-400/15 p-3">
            <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
          </div>
          <h2 className="text-sm font-medium text-foreground">No favorites yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Star an item or collection and it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <FavoritesList items={items} collections={collections} />
      )}
    </div>
  )
}
