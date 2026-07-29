import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { Reveal } from "./reveal"
import { HomeButton } from "./home-button"
import { AI_CAPABILITIES, AI_TAGS } from "./data"

/* --- Hand-tokenized code shown in the editor mockup --- */
const TOKEN = {
  key: "text-[#c084fc]",
  fn: "text-[#60a5fa]",
  num: "text-[#fbbf24]",
} as const

interface Seg {
  c?: keyof typeof TOKEN
  v: string
}

const CODE_LINES: Seg[][] = [
  [
    { c: "key", v: "export function" },
    { v: " " },
    { c: "fn", v: "useDebounce" },
    { v: "<T>(value: T, delay = " },
    { c: "num", v: "300" },
    { v: ") {" },
  ],
  [
    { v: "  " },
    { c: "key", v: "const" },
    { v: " [debounced, setDebounced] = " },
    { c: "fn", v: "useState" },
    { v: "(value);" },
  ],
  [{ v: "  " }, { c: "fn", v: "useEffect" }, { v: "(() => {" }],
  [
    { v: "    " },
    { c: "key", v: "const" },
    { v: " id = " },
    { c: "fn", v: "setTimeout" },
    { v: "(() => " },
    { c: "fn", v: "setDebounced" },
    { v: "(value), delay);" },
  ],
  [
    { v: "    " },
    { c: "key", v: "return" },
    { v: " () => " },
    { c: "fn", v: "clearTimeout" },
    { v: "(id);" },
  ],
  [{ v: "  }, [value, delay]);" }],
  [{ v: "  " }, { c: "key", v: "return" }, { v: " debounced;" }],
  [{ v: "}" }],
]

function ChecklistItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-base text-(--home-text)">
      <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-[rgba(34,197,94,0.14)] text-[0.72rem] font-bold text-(--home-note)">
        ✓
      </span>
      {children}
    </li>
  )
}

export function AiSection() {
  return (
    <section className="mx-auto max-w-[1180px] px-6 pb-20 pt-10">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
        <Reveal className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.1)] px-3.5 py-1.5 text-[0.82rem] font-medium text-(--home-prompt)">
            ⚡ Pro Feature
          </span>
          <h2 className="mt-4.5 text-[clamp(1.9rem,4vw,2.6rem)] font-bold tracking-[-0.02em]">
            Let AI do the busywork
          </h2>
          <p className="my-6 text-[1.05rem] text-(--home-text-dim)">
            DevStash Pro reads your content and handles the tedious parts — so
            you stay in flow.
          </p>
          <ul className="mb-[30px] flex flex-col gap-[13px]">
            {AI_CAPABILITIES.map((capability) => (
              <ChecklistItem key={capability}>{capability}</ChecklistItem>
            ))}
          </ul>
          <HomeButton asChild tone="primary">
            <Link href="#pricing">Unlock Pro</Link>
          </HomeButton>
        </Reveal>

        <Reveal className="min-w-0">
          <div className="overflow-hidden rounded-[14px] border border-(--home-border) bg-[#0d0f14] shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3 border-b border-(--home-border) bg-[#14161d] px-3.5 py-[11px]">
              <span className="inline-flex gap-1.5">
                <i className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" />
                <i className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" />
                <i className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
              </span>
              <span className="font-mono text-[0.78rem] text-(--home-text-mute)">
                useDebounce.ts
              </span>
            </div>

            <pre className="overflow-x-auto p-[18px] font-mono text-[0.8rem] leading-[1.7] text-[#c7ccd6]">
              <code>
                {CODE_LINES.map((line, i) => (
                  <span key={i}>
                    {line.map((seg, j) =>
                      seg.c ? (
                        <span key={j} className={TOKEN[seg.c]}>
                          {seg.v}
                        </span>
                      ) : (
                        seg.v
                      )
                    )}
                    {i < CODE_LINES.length - 1 ? "\n" : null}
                  </span>
                ))}
              </code>
            </pre>

            <div className="border-t border-(--home-border) bg-[rgba(99,102,241,0.05)] px-[18px] pb-[18px] pt-3.5">
              <span className="mb-2.5 block text-[0.78rem] font-semibold text-(--home-accent-2)">
                ✨ AI Generated Tags
              </span>
              <div className="flex flex-wrap gap-2">
                {AI_TAGS.map((tag) => (
                  <span
                    key={tag.label}
                    className="home-tag rounded-full border border-[color-mix(in_oklab,var(--c)_40%,transparent)] bg-[color-mix(in_oklab,var(--c)_15%,transparent)] px-2.5 py-[3px] text-[0.75rem] font-semibold text-(--c)"
                    style={{ "--c": tag.color } as CSSProperties}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
