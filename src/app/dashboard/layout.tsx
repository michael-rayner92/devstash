import type { ReactNode } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { getSidebarItemTypes, getSidebarCollections } from "@/lib/db/sidebar"
import { prisma } from "@/lib/prisma"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const demoUser = await prisma.user.findUnique({ where: { email: "demo@devstash.io" } })

  const [itemTypes, allCollections] = demoUser
    ? await Promise.all([
        getSidebarItemTypes(),
        getSidebarCollections(demoUser.id),
      ])
    : [[], []]

  const favoriteCollections = allCollections.filter((c) => c.isFavorite)
  const recentCollections = allCollections.filter((c) => !c.isFavorite).slice(0, 5)

  const user = demoUser
    ? { name: demoUser.name, email: demoUser.email, isPro: demoUser.isPro }
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
