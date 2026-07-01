import type { ReactNode } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { getSidebarItemTypes, getSidebarCollections } from "@/lib/db/sidebar"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function AuthenticatedShell({ children }: { children: ReactNode }) {
  const session = await auth()
  const userId = session?.user?.id

  const dbUser = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null

  const [itemTypes, allCollections] = dbUser
    ? await Promise.all([
        getSidebarItemTypes(),
        getSidebarCollections(dbUser.id),
      ])
    : [[], []]

  const favoriteCollections = allCollections.filter((c) => c.isFavorite)
  const recentCollections = allCollections.filter((c) => !c.isFavorite).slice(0, 5)

  const user = dbUser
    ? {
        name: dbUser.name,
        email: dbUser.email,
        isPro: dbUser.isPro,
        image: session?.user?.image ?? null,
      }
    : null

  return (
    <DashboardShell
      itemTypes={itemTypes}
      favoriteCollections={favoriteCollections}
      recentCollections={recentCollections}
      user={user}
    >
      {children}
    </DashboardShell>
  )
}
