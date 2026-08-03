import { Reveal } from "./reveal"
import { PricingToggle } from "./pricing-toggle"

export function Pricing() {
  return (
    <section
      id="pricing"
      className="mx-auto max-w-[1180px] scroll-mt-[78px] px-6 py-20"
    >
      <Reveal className="mx-auto max-w-[640px] text-center">
        <span className="mb-3 inline-block text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-(--home-accent-text)">
          Simple pricing
        </span>
        <h2 className="text-[clamp(1.9rem,4vw,2.7rem)] font-bold tracking-[-0.02em]">
          Start free. Upgrade when you&apos;re ready.
        </h2>
      </Reveal>

      <PricingToggle />
    </section>
  )
}
