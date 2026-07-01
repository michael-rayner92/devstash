import type { ReactNode } from "react"
import { AuthenticatedShell } from "@/components/dashboard/authenticated-shell"

export default function ItemsLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>
}
