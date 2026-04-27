import Link from "next/link"
import { mockUser, mockItemTypes, mockItems } from "@/lib/mock-data"
import { CollectionCard } from "@/components/dashboard/collection-card"
import { ItemRow } from "@/components/dashboard/item-row"
import { getRecentCollections, getDashboardStats } from "@/lib/db/collections"
import { prisma } from "@/lib/prisma"

const typeMap = Object.fromEntries(mockItemTypes.map((t) => [t.id, t]))

const pinnedItems = mockItems.filter((i) => i.isPinned)
const recentItems = mockItems.slice(0, 10)

export default async function DashboardPage() {
  const firstName = mockUser.name?.split(" ")[0] ?? "there"

  // Temporary: use demo user until auth is wired up
  const demoUser = await prisma.user.findUnique({ where: { email: "demo@devstash.io" } })

  const [collections, stats] = demoUser
    ? await Promise.all([
        getRecentCollections(demoUser.id, 6),
        getDashboardStats(demoUser.id),
      ])
    : [[], { totalItems: 0, totalCollections: 0, totalFavorites: 0 }]

  return (
    <div className="p-6 space-y-8 max-w-screen-2xl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Good morning, {firstName}</h1>
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
          value={mockUser.isPro ? "Pro" : "—"}
          sub={mockUser.isPro ? "unlimited" : "upgrade to unlock"}
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

      {/* Pinned items */}
      {pinnedItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold">Pinned</h2>
          <div className="space-y-2">
            {pinnedItems.map((item) => {
              const type = typeMap[item.itemTypeId]
              return <ItemRow key={item.id} item={item} type={type} />
            })}
          </div>
        </section>
      )}

      {/* Recent items */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Recent items</h2>
        <div className="space-y-2">
          {recentItems.map((item) => {
            const type = typeMap[item.itemTypeId]
            return <ItemRow key={item.id} item={item} type={type} />
          })}
        </div>
      </section>
    </div>
  )
}

function StatsCard({
  title,
  value,
  sub,
}: {
  title: string
  value: string | number
  sub: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}
