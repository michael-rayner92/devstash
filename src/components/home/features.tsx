import type { CSSProperties } from "react"
import { Reveal } from "./reveal"
import { FEATURES } from "./data"

export function Features() {
  return (
    <section
      id="features"
      className="mx-auto max-w-[1180px] scroll-mt-[78px] px-6 py-20"
    >
      <Reveal className="mx-auto mb-12 max-w-[640px] text-center">
        <span className="mb-3 inline-block text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-(--home-accent-text)">
          Everything in one place
        </span>
        <h2 className="text-[clamp(1.9rem,4vw,2.7rem)] font-bold tracking-[-0.02em]">
          One home for everything you stash
        </h2>
        <p className="mt-3.5 text-[1.05rem] text-(--home-text-dim)">
          Seven built-in types, powerful search, and collections that keep it
          all connected.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <Reveal key={feature.title} className="h-full">
              <article
                className="group relative h-full overflow-hidden rounded-[14px] border border-(--home-border) bg-(--home-bg-card) p-[26px] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--c)_55%,var(--home-border))] hover:shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
                style={{ "--c": feature.color } as CSSProperties}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-[3px] bg-(--c) opacity-80"
                />
                <span className="mb-4 grid h-[46px] w-[46px] place-items-center rounded-xl bg-[color-mix(in_oklab,var(--c)_16%,transparent)] text-(--c)">
                  <Icon className="size-6" />
                </span>
                <h3 className="mb-2 text-[1.15rem] font-bold">{feature.title}</h3>
                <p className="text-[0.94rem] text-(--home-text-dim)">
                  {feature.description}
                </p>
              </article>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
