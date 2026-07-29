import Link from "next/link"
import { Reveal } from "./reveal"
import { HomeButton } from "./home-button"
import { ROUTES } from "./data"

export function Cta() {
  return (
    <section className="mx-auto mb-[90px] mt-10 max-w-[1180px] px-6">
      <Reveal>
        <div className="rounded-[20px] border border-(--home-border) bg-(--home-bg-elev) bg-[radial-gradient(600px_circle_at_50%_0%,rgba(99,102,241,0.2),transparent_60%)] px-6 py-12 text-center sm:px-8 sm:py-16">
          <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-bold tracking-[-0.02em]">
            Ready to Organize Your Knowledge?
          </h2>
          <p className="mx-auto mb-7 mt-3.5 max-w-[480px] text-[1.05rem] text-(--home-text-dim)">
            Join developers who stopped losing their best snippets, prompts, and
            commands.
          </p>
          <HomeButton asChild tone="primary" large>
            <Link href={ROUTES.register}>Get Started Free</Link>
          </HomeButton>
        </div>
      </Reveal>
    </section>
  )
}
