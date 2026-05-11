import Link from "next/link"
import { CollectionCard } from "@/components/dashboard/collection-card"
import { ItemRow } from "@/components/dashboard/item-row"
import { StatsCard } from "@/components/dashboard/stats-card"
import { getRecentCollections, getDashboardStats } from "@/lib/db/collections"
import { getPinnedItems, getRecentItems } from "@/lib/db/items"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id

  const dbUser = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null

  const [collections, stats, pinnedItems, recentItems] = dbUser
    ? await Promise.all([
        getRecentCollections(dbUser.id, 6),
        getDashboardStats(dbUser.id),
        getPinnedItems(dbUser.id),
        getRecentItems(dbUser.id, 10),
      ])
    : [[], { totalItems: 0, totalCollections: 0, totalFavorites: 0 }, [], []]

  const firstName = dbUser?.name?.split(" ")[0] ?? "there"

  return (
    <div className="p-6 space-y-8 max-w-screen-2xl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{getGreeting()}, {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you&apos;ve stashed — snippets, prompts, commands, and more. Jump back into
          your latest collections.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Items stashed"
          value={stats.totalItems}
          sub="50 on free plan"
        />
        <StatsCard
          title="Collections"
          value={stats.totalCollections}
          sub="3 on free plan"
        />
        <StatsCard
          title="Favorites"
          value={stats.totalFavorites}
          sub="across all types"
        />
        <StatsCard
          title="AI credits"
          value="—"
          sub="upgrade to unlock"
        />
      </div>

      {/* Recent collections */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold">Collections</h2>
            <p className="text-xs text-muted-foreground">
              {stats.totalCollections} total &middot; grouped by dominant type
            </p>
          </div>
          <Link
            href="/collections"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {collections.map((col) => (
            <CollectionCard key={col.id} collection={col} />
          ))}
        </div>
      </section>

      {/* Pinned items — only shown when there are pinned items */}
      {pinnedItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold">Pinned</h2>
          <div className="space-y-2">
            {pinnedItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Recent items */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Recent items</h2>
        <div className="space-y-2">
          {recentItems.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  )
}
