"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { FolderPlus, PanelLeft, Plus, Search, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { ItemDrawerProvider } from "@/components/items/item-drawer-provider"
import { ItemCreateDialog } from "@/components/items/item-create-dialog"
import { CollectionCreateDialog } from "@/components/collections/collection-create-dialog"
import { CommandPalette } from "@/components/search/command-palette"
import { SidebarContent, type SidebarProps } from "./sidebar-content"
import { cn } from "@/lib/utils"

type DashboardShellProps = SidebarProps & { children: ReactNode }

export function DashboardShell({ children, ...sidebarProps }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  // Create dialogs are lifted here so both the desktop labelled buttons and the
  // mobile "+" menu drive the same single dialog instance.
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false)

  // Cmd+K (Mac) / Ctrl+K (Windows/Linux) toggles the command palette globally.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <ItemDrawerProvider>
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        {/* Left: nav toggles + wordmark. flex-1 balances the right group so the
            search stays centered in the header. No min-w-0 here, so this group
            never shrinks below its content — the mobile nav toggle stays visible
            and the search bar (the only min-w-0 sibling) absorbs the squeeze. */}
        <div className="flex flex-1 items-center gap-2">
          {/* Mobile toggle — opens Sheet */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="md:hidden"
            aria-label="Open navigation"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>

          {/* Desktop toggle — collapses sidebar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="hidden md:flex"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>

          <span className="text-sm font-semibold">DevStash</span>
        </div>

        {/* Center: full search bar. Hidden below sm — on mobile it shrank to a
            ~35px sliver, so it becomes an icon button in the right group instead. */}
        <div className="relative hidden w-full max-w-md min-w-0 sm:block">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 w-full items-center rounded-md border border-input bg-transparent pl-8 pr-14 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <span className="truncate">Search items and collections...</span>
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex flex-1 items-center justify-end gap-2">
          {/* Mobile search — opens the same command palette */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPaletteOpen(true)}
            className="sm:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" asChild aria-label="Favorites">
            <Link href="/favorites">
              <Star className="h-5 w-5" />
            </Link>
          </Button>

          {/* Desktop create buttons */}
          <Button
            variant="outline"
            onClick={() => setCollectionDialogOpen(true)}
            className="hidden sm:inline-flex"
          >
            <FolderPlus />
            New collection
          </Button>
          <Button onClick={() => setItemDialogOpen(true)} className="hidden sm:inline-flex">
            <Plus />
            New item
          </Button>

          {/* Mobile create menu — merges both create actions into one "+". */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button size="icon" className="sm:hidden" aria-label="Create new">
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setItemDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New item
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setCollectionDialogOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New collection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden md:flex flex-col shrink-0 border-r border-border overflow-hidden transition-[width] duration-300 ease-in-out",
            sidebarOpen ? "w-64" : "w-0 border-r-transparent"
          )}
        >
          <SidebarContent {...sidebarProps} />
        </aside>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile Sheet — always a drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-64 flex-col p-0">
          <SheetTitle>Navigation</SheetTitle>
          <SidebarContent {...sidebarProps} />
        </SheetContent>
      </Sheet>

      {/* Single dialog instances driven by both desktop buttons and the mobile menu. */}
      <ItemCreateDialog
        itemTypes={sidebarProps.itemTypes}
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
      />
      <CollectionCreateDialog
        open={collectionDialogOpen}
        onOpenChange={setCollectionDialogOpen}
      />

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
    </ItemDrawerProvider>
  )
}
