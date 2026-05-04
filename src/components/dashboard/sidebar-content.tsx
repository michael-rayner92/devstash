"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Star,
  Clock,
  Plus,
  Code2,
  Sparkles,
  Terminal,
  StickyNote,
  Link as LinkIcon,
  File,
  Image as ImageIcon,
} from "lucide-react"
import type { SidebarItemType, SidebarCollection } from "@/lib/db/sidebar"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const iconMap: Record<string, React.ElementType> = {
  Code: Code2,
  Sparkles,
  Terminal,
  StickyNote,
  Link: LinkIcon,
  File,
  Image: ImageIcon,
}

export type SidebarProps = {
  itemTypes: SidebarItemType[]
  favoriteCollections: SidebarCollection[]
  recentCollections: SidebarCollection[]
  user: { name: string | null; email: string; isPro: boolean } | null
}

export function SidebarContent({ itemTypes, favoriteCollections, recentCollections, user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Main nav */}
      <nav className="px-3 pt-4 pb-2 space-y-0.5">
        <NavLink href="/dashboard" icon={Home} label="Overview" active={pathname === "/dashboard"} />
        <NavLink href="/dashboard/favorites" icon={Star} label="Favorites" active={pathname === "/dashboard/favorites"} />
        <NavLink href="/dashboard/recent" icon={Clock} label="Recently used" active={pathname === "/dashboard/recent"} />
      </nav>

      {/* Item types */}
      <div className="px-3 mt-4">
        <SectionHeader label="Item types" action={<Plus className="h-3.5 w-3.5" />} />
        <nav className="mt-1 space-y-0.5">
          {itemTypes.map((type) => {
            const Icon = iconMap[type.icon] ?? File
            const href = `/items/${type.name.toLowerCase()}s`
            return (
              <Link
                key={type.id}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                  pathname === href
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: type.color }} />
                <span className="flex-1 capitalize">{type.name}s</span>
                {type.isPro && (
                  <Badge variant="secondary" className="px-1 py-0 text-[10px] font-semibold leading-4 text-muted-foreground">PRO</Badge>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Collections */}
      <div className="px-3 mt-6">
        <SectionHeader label="Collections" />

        {favoriteCollections.length > 0 && (
          <>
            <p className="px-2 mt-2 mb-0.5 text-xs text-muted-foreground/50">Favourites</p>
            <nav className="space-y-0.5">
              {favoriteCollections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.id}`}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                  <span className="flex-1 truncate">{col.name}</span>
                  <span className="text-xs text-muted-foreground/50">{col.itemCount}</span>
                </Link>
              ))}
            </nav>
          </>
        )}

        {recentCollections.length > 0 && (
          <>
            <p className="px-2 mt-2 mb-0.5 text-xs text-muted-foreground/50">Recent</p>
            <nav className="space-y-0.5">
              {recentCollections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.id}`}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: col.dominantColor ?? "#6b7280" }}
                  />
                  <span className="flex-1 truncate">{col.name}</span>
                </Link>
              ))}
            </nav>
          </>
        )}

        <Link
          href="/collections"
          className="mt-2 flex items-center px-2 py-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          View all collections
        </Link>
      </div>

      <div className="flex-1" />

      {/* Upgrade CTA */}
      {user && !user.isPro && (
        <div className="mx-3 mb-3 rounded-lg bg-accent p-3">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Upgrade to Pro</span>
          </div>
          <p className="text-xs text-muted-foreground">Unlock AI &amp; uploads</p>
        </div>
      )}

      {/* User area */}
      {user && (
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
              {getInitials(user.name ?? "")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {user.isPro ? "PRO" : "FREE"}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  )
}

function SectionHeader({
  label,
  action,
}: {
  label: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-2 mb-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      {action && (
        <button className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground">
          {action}
        </button>
      )}
    </div>
  )
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
}
