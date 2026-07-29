import Link from "next/link"
import { Brand } from "./brand"
import { FOOTER_COLUMNS } from "./data"

const LINK_CLASS =
  "text-[0.92rem] text-(--home-text-dim) transition-colors hover:text-(--home-text)"

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-(--home-border) bg-(--home-bg-elev)">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-10 px-6 pb-9 pt-[54px] md:grid-cols-[1.4fr_2fr]">
        <div>
          <Brand markSize={20} />
          <p className="mt-3.5 text-[0.9rem] text-(--home-text-mute)">
            Your developer second brain.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-2.5">
              <h4 className="mb-1 text-[0.82rem] uppercase tracking-[0.06em] text-(--home-text-mute)">
                {column.title}
              </h4>
              {column.links.map((link) => (
                <Link key={link.label} href={link.href} className={LINK_CLASS}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2.5 border-t border-(--home-border) px-6 py-5 text-[0.86rem] text-(--home-text-mute) max-sm:justify-center max-sm:text-center">
        <span>© {year} DevStash. All rights reserved.</span>
        <span className="flex gap-1">
          <Link href="#" className="hover:text-(--home-text)">
            Privacy
          </Link>
          ·
          <Link href="#" className="hover:text-(--home-text)">
            Terms
          </Link>
        </span>
      </div>
    </footer>
  )
}
