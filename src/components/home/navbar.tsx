"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Brand } from "./brand"
import { HomeButton } from "./home-button"
import { ROUTES } from "./data"

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
]

/** Fixed nav that grows opaque once the page is scrolled past the top. */
export function Navbar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    // Initial sync, deferred so we never setState synchronously in the effect.
    const raf = requestAnimationFrame(onScroll)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  // Esc closes the mobile menu, matching every other dismissible surface here.
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [menuOpen])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[100] border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled || menuOpen
          ? "border-b-(--home-border) bg-[rgba(10,11,15,0.85)] backdrop-blur-[14px]"
          : "border-b-transparent bg-[rgba(10,11,15,0.35)] backdrop-blur-[6px]"
      )}
    >
      <div className="mx-auto flex h-[66px] w-full max-w-[1180px] items-center gap-5 px-6">
        <Brand />

        <nav aria-label="Primary" className="ml-[14px] hidden gap-[26px] md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[0.94rem] font-medium text-(--home-text-dim) transition-colors hover:text-(--home-text)"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          {isAuthenticated ? (
            <HomeButton asChild tone="primary">
              <Link href={ROUTES.dashboard}>Go to Dashboard</Link>
            </HomeButton>
          ) : (
            <>
              {/* Below md this lives in the mobile menu instead, so a phone user
                  still has a sign-in route (previously there was none at all). */}
              <HomeButton asChild tone="ghost" className="hidden md:inline-flex">
                <Link href={ROUTES.signIn}>Sign In</Link>
              </HomeButton>
              <HomeButton asChild tone="primary">
                <Link href={ROUTES.register}>Get Started</Link>
              </HomeButton>
            </>
          )}

          <HomeButton
            tone="outline"
            aria-expanded={menuOpen}
            aria-controls="home-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="px-2.5 md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </HomeButton>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="home-mobile-menu"
          aria-label="Mobile"
          className="border-t border-(--home-border) px-6 pb-4 pt-2 md:hidden"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block py-3 text-[0.98rem] font-medium text-(--home-text-dim) transition-colors hover:text-(--home-text)"
            >
              {link.label}
            </Link>
          ))}
          {!isAuthenticated && (
            <Link
              href={ROUTES.signIn}
              onClick={() => setMenuOpen(false)}
              className="block py-3 text-[0.98rem] font-medium text-(--home-text-dim) transition-colors hover:text-(--home-text)"
            >
              Sign In
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}
