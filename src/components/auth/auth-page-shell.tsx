import type { ReactNode } from "react"
import type { NavbarPage } from "@/components/home/navbar"
import { Navbar } from "@/components/home/navbar"

/**
 * Wraps an auth page in the marketing chrome: the homepage top nav plus the
 * `.home` scope it depends on (every nav colour is a CSS var defined there, and
 * it also supplies the dark surface so the fixed nav has no seam beneath it).
 *
 * The nav is fixed at 66px, so `main` is padded clear of it. The padding is
 * deliberately larger than the nav (and symmetric, preserving these pages'
 * original viewport centring): on a short viewport the card outgrows the
 * centring box and pins to the padding edge, and 66px exactly would leave the
 * heading tucked under the nav with no clearance.
 */
export function AuthPageShell({
  isAuthenticated,
  page,
  children,
}: {
  isAuthenticated: boolean
  /** "home" is excluded — this shell is only ever an auth route. */
  page: Exclude<NavbarPage, "home">
  children: ReactNode
}) {
  return (
    <div className="home flex flex-1 flex-col">
      <Navbar isAuthenticated={isAuthenticated} page={page} />
      <main className="flex flex-1 items-center justify-center px-4 py-[90px]">
        <div className="w-full max-w-sm space-y-6">{children}</div>
      </main>
    </div>
  )
}
