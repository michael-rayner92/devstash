"use client"

import { useState } from "react"
import { PanelLeft, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { SidebarContent, type SidebarProps } from "./sidebar-content"
import { cn } from "@/lib/utils"

type DashboardShellProps = SidebarProps & { children: React.ReactNode }

export function DashboardShell({ children, ...sidebarProps }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
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

        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items, tags, collections..."
            className="pl-8"
          />
        </div>

        <Button className="ml-auto">
          <Plus />
          New item
        </Button>
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
    </div>
  )
}
