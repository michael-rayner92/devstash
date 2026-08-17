import Link from "next/link"
import { CollectionCard } from "@/components/dashboard/collection-card"
import { ItemRow } from "@/components/dashboard/item-row"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ProBadge } from "@/components/billing/plan-badge"
import { getRecentCollections, getDashboardStats } from "@/lib/db/collections"
import { getPinnedItems, getRecentItems } from "@/lib/db/items"
import { DASHBOARD_COLLECTIONS_LIMIT, DASHBOARD_RECENT_ITEMS_LIMIT } from "@/lib/pagination"
import { getPlanLimits } from "@/lib/usage-limits"
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
        getRecentCollections(dbUser.id, DASHBOARD_COLLECTIONS_LIMIT),
        getDashboardStats(dbUser.id),
        getPinnedItems(dbUser.id),
        getRecentItems(dbUser.id, DASHBOARD_RECENT_ITEMS_LIMIT),
      ])
    : [[], { totalItems: 0, totalCollections: 0, totalFavorites: 0 }, [], []]

  const firstName = dbUser?.name?.split(" ")[0] ?? "there"

  // Plan-aware stats copy. A null limit means unlimited — either the user is
  // Pro, or enforcement is still off (BILLING_ENFORCED), in which case
  // promising a cap we don't apply would be the misleading option.
  const isPro = dbUser?.isPro ?? false
  const limits = getPlanLimits(isPro)
  const planSub = (limit: number | null) =>
    limit === null ? "unlimited" : `${limit} on free plan`

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
          sub={planSub(limits.items)}
        />
        <StatsCard
          title="Collections"
          value={stats.totalCollections}
          sub={planSub(limits.collections)}
        />
        <StatsCard
          title="Favorites"
          value={stats.totalFavorites}
          sub="across all types"
        />
        <StatsCard
          title="AI credits"
          value="—"
          sub={isPro ? "included with Pro" : "upgrade to unlock"}
          badge={<ProBadge size="sm" />}
        />
      </div>

      {/* Recent collections */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Collections</h2>
            <p className="text-xs text-muted-foreground">
              {/* Explicit {" "} — the JSX transform strips the leading space of
                  the text node after the expression, rendering "5total". */}
              {stats.totalCollections}{" "}total &middot; grouped by dominant type
            </p>
          </div>
          <Link
            href="/collections"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {collections.map((col) => (
            <CollectionCard key={col.id} collection={col} />
          ))}
        </div>
      </section>

      {/* Pinned items — only shown when there are pinned items */}
      {pinnedItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Pinned</h2>
          <div className="space-y-2">
            {pinnedItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Recent items */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent items</h2>
        <div className="space-y-2">
          {recentItems.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  )
}
