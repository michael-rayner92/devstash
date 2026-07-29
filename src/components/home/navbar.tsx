"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[100] flex h-[66px] items-center border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "border-b-(--home-border) bg-[rgba(10,11,15,0.85)] backdrop-blur-[14px]"
          : "border-b-transparent bg-[rgba(10,11,15,0.35)] backdrop-blur-[6px]"
      )}
    >
      <div className="mx-auto flex w-full max-w-[1180px] items-center gap-5 px-6">
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
              <HomeButton asChild tone="ghost" className="hidden sm:inline-flex">
                <Link href={ROUTES.signIn}>Sign In</Link>
              </HomeButton>
              <HomeButton asChild tone="primary">
                <Link href={ROUTES.register}>Get Started</Link>
              </HomeButton>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
