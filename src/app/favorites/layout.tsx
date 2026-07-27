import type { ReactNode } from "react"
import { AuthenticatedShell } from "@/components/dashboard/authenticated-shell"

export default function FavoritesLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>
}
