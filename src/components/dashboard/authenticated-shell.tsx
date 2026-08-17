import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { EditorPreferencesProvider } from "@/components/editor-preferences/editor-preferences-provider"
import { getSidebarItemTypes, getSidebarCollections } from "@/lib/db/sidebar"
import { normalizeEditorPreferences } from "@/lib/editor-preferences"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function AuthenticatedShell({ children }: { children: ReactNode }) {
  const session = await auth()
  const userId = session?.user?.id

  const dbUser = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null

  // `src/proxy.ts` builds its `auth` from the edge-safe `auth.config.ts`, which
  // has no DB access — it can only check that the token is signed and unexpired.
  // So a session whose user row is gone (purged account, reset database, token
  // minted against a different DB branch) reaches this far, and rendering the
  // shell with empty defaults would show a signed-in-looking but blank
  // dashboard. This is the first point that can actually tell, so it redirects.
  if (!dbUser) redirect("/sign-in")

  const [itemTypes, allCollections] = await Promise.all([
    getSidebarItemTypes(),
    getSidebarCollections(dbUser.id),
  ])

  const favoriteCollections = allCollections.filter((c) => c.isFavorite)
  const recentCollections = allCollections.filter((c) => !c.isFavorite).slice(0, 5)

  const user = {
    name: dbUser.name,
    email: dbUser.email,
    isPro: dbUser.isPro,
    image: session?.user?.image ?? null,
  }

  const editorPreferences = normalizeEditorPreferences(dbUser.editorPreferences)

  return (
    <EditorPreferencesProvider initialPreferences={editorPreferences}>
      <DashboardShell
        itemTypes={itemTypes}
        favoriteCollections={favoriteCollections}
        recentCollections={recentCollections}
        user={user}
      >
        {children}
      </DashboardShell>
    </EditorPreferencesProvider>
  )
}
