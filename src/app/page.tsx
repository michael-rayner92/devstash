import type { Metadata } from "next"
import { auth } from "@/auth"
import { Navbar } from "@/components/home/navbar"
import { Hero } from "@/components/home/hero"
import { Features } from "@/components/home/features"
import { AiSection } from "@/components/home/ai-section"
import { Pricing } from "@/components/home/pricing"
import { Cta } from "@/components/home/cta"
import { Footer } from "@/components/home/footer"

export const metadata: Metadata = {
  title: "DevStash — Stop Losing Your Developer Knowledge",
  description:
    "One fast, searchable, AI-enhanced hub for every code snippet, prompt, command, note, file, and link a developer stashes away.",
}

export default async function Home() {
  const session = await auth()
  const isAuthenticated = Boolean(session?.user)

  return (
    <div className="home flex-1">
      <Navbar isAuthenticated={isAuthenticated} />
      <main>
        <Hero />
        <Features />
        <AiSection />
        <Pricing />
        <Cta />
      </main>
      <Footer />
    </div>
  )
}
