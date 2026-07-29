import Link from "next/link"
import { BrandMark } from "./icons"

/** DevStash wordmark + logo tile, shared by the navbar and footer. */
export function Brand({ markSize = 22 }: { markSize?: number }) {
  return (
    <Link
      href="/"
      aria-label="DevStash home"
      className="inline-flex items-center gap-[9px] text-[1.12rem] font-extrabold tracking-[-0.03em] text-(--home-text)"
    >
      <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-linear-to-br from-(--home-accent) to-(--home-accent-2) text-white shadow-[0_4px_14px_rgba(99,102,241,0.4)]">
        <BrandMark size={markSize} />
      </span>
      <span>
        Dev<span className="text-(--home-accent)">Stash</span>
      </span>
    </Link>
  )
}
