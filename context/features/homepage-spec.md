# Homepage (Marketing Landing Page)

## Overview

Turn the static prototype in `prototypes/homepage/` (`index.html`, `styles.css`, `script.js`) into the real app homepage at `/` (`src/app/page.tsx`), rebuilt with the project's stack (Next.js App Router + Tailwind v4 + shadcn/ui). The current `/` is a placeholder `<h1>Devstash</h1>` and must be replaced.

The page is **public** (no auth guard, not under the dashboard shell). Keep the prototype's visual design and animations; only the implementation changes.

## Sections (match the prototype, top to bottom)

1. **Navbar** (fixed) — logo, `Features` / `Pricing` anchor links, `Sign In` + `Get Started` buttons. Grows opaque on scroll.
2. **Hero** — pill, gradient headline, subheadline, two CTA buttons, "no credit card" note, and the **chaos → order** visual.
3. **Features** — 6 cards (Code Snippets, AI Prompts, Instant Search, Commands, Files & Docs, Collections), each with its type accent color.
4. **AI / Pro** — two columns: Pro badge + capability checklist (left), code-editor mockup with animated "AI Generated Tags" (right).
5. **Pricing** — Free vs Pro, "Most Popular" badge on Pro, monthly/yearly billing toggle ($8/mo ↔ $6/mo billed yearly, $72/yr, "Save 25%").
6. **CTA** — "Ready to Organize Your Knowledge?" + button.
7. **Footer** — logo, link columns, copyright with current year.

## Server / Client split

Default everything to **server components**; add `'use client'` only for the interactive pieces below. Keep `page.tsx` a server component that composes the sections.

**Server components** (`src/components/home/`): `Hero`, `Features`, `AiSection`, `Pricing` (renders the toggle client component inside), `Cta`, `Footer`, and static nav markup. The footer year is computed on the server (`new Date().getFullYear()`) — no client needed.

**Client components** (`'use client'`):

- `ChaosAnimation` — the floating-icons box. `requestAnimationFrame` drift + wall-bounce + rotation/scale pulse + pointer-repel, ported from `script.js`. Respect `prefers-reduced-motion` (static placement, no rAF). Clean up the rAF loop and listeners on unmount.
- `Navbar` (or a small `useScrolled` wrapper) — toggles the opaque style via a passive `scroll` listener.
- `PricingToggle` — `useState` for monthly/yearly; drives the Pro price/period/tagline text and the switch's `aria-checked`.
- `Reveal` — a reusable wrapper using `IntersectionObserver` to fade children in on scroll (replaces the prototype's `.reveal`/`.is-visible`). Falls back to visible when reduced-motion or no `IntersectionObserver`.

## Link / button targets (must resolve to real routes)

- `Sign In` → `/sign-in`
- `Get Started` / `Get Started Free` / `Start Pro Trial` / final CTA → `/register`
- `Features` → `#features`, `Pricing` → `#pricing`, `See how it works` → `#features`
- Footer `Features`/`Pricing` → anchors; other footer links (Docs, Blog, etc.) have no routes yet — point at `#` (leave as clear placeholders, don't invent routes).
- Use `next/link` for internal routes and anchors; buttons use the shadcn `Button` (`asChild` + `<Link>`) where practical.
- **Optional (nice-to-have):** the page may call `auth()`; if a session exists, swap `Sign In`/`Get Started` for a single `Go to Dashboard` → `/dashboard`.

## Styling

- Tailwind v4 utilities + shadcn `Button` — no separate `.css` file, no inline `style` except the per-item **accent color** passed as a CSS custom property (e.g. `style={{ "--c": color }}`) the way existing cards (`ItemCard`, prototype mini-cards) already do.
- The prototype uses a bespoke dark palette (surfaces + 7 type accents) that differs from the app's OKLCH theme. Scope these as CSS variables for the landing page only — define them under a wrapper class/selector in `globals.css` (via `@theme` or a scoped `:root`-style block) rather than overriding the app tokens. The homepage always renders dark (it's a marketing page), independent of the app's theme toggle.
- Type accent colors (from `homepage-mockup-spec.md`): Snippet `#3b82f6`, Prompt `#f59e0b`, Command `#06b6d4`, Note `#22c55e`, File `#64748b`, Image `#ec4899`, URL/Link `#6366f1`. Note these are the **prototype's** marketing colors and intentionally differ from the app's system-type colors — keep the prototype values.
- Fonts: reuse the app's existing Geist setup from the root layout — do **not** add the prototype's Google Fonts `<link>` (Inter/JetBrains Mono). Use the app's mono variable for code/`kbd` bits.
- Keep the CSS animations (arrow pulse, tag fade-in, reveal transitions) and the `prefers-reduced-motion` guard.

## Keep it DRY

Data-drive every repeated block from arrays mapped in the component — don't hand-write duplicate markup:

- Feature cards, pricing feature lists, footer link columns, dashboard-preview mini-cards, and the chaos icon set each come from a typed array.
- Extract the inline SVGs (brand mark, chaos-source icons, feature icons) into small components or a lookup map. Prefer `lucide-react` icons where an equivalent exists; keep custom inline SVGs only for the brand-specific marks (logo, chaos sources like Notion/Slack) with no Lucide match.
- Define the type-color list once and reference it across the features grid, mini-cards, and AI tags.

## Out of scope

- No real pricing/checkout wiring (Stripe) — buttons just route to `/register`.
- No new server actions, DB queries, or API routes (nothing under `src/actions/` or `src/lib/` requiring tests). Static marketing content only.
- Footer secondary links (Docs, Guides, API, Blog, etc.) stay placeholders.

## Verification

- `npm run lint`, `npm run build` pass.
- In-browser (desktop + mobile ~375px): chaos icons animate and repel from the cursor; navbar opacifies on scroll; sections fade in; pricing toggle updates price/period/tagline; all buttons/links navigate correctly; no horizontal overflow; no console errors. Confirm `prefers-reduced-motion` disables the animations.
- No unit tests expected (no actions/utilities touched — matches the coding-standards test scope). If any pure helper is extracted into `src/lib/`, colocate a test for it.
</content>
</invoke>
