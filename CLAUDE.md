# DevStash

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Commands

```bash
npm run dev         # start dev server at http://localhost:3000
npm run build       # production build
npm run start       # serve the production build
npm run lint        # run ESLint
npm run test        # run unit tests once (Vitest)
npm run test:watch  # run unit tests in watch mode

npm run db:generate # prisma generate (also runs on postinstall)
npm run db:migrate  # prisma migrate dev — never `db push`
npm run db:seed     # seed demo user + collections (NOT safe against production)
npm run db:studio   # prisma studio
npm run db:test     # verify seeded data (scripts/test-db.ts)
npm run db:purge    # wipe non-demo users (scripts/purge-users.ts)
```

The 7 system `ItemType` rows are created by a **migration**
(`20260817121725_seed_system_item_types`), not by `db:seed` — a freshly migrated
database has them without seeding.

Unit tests cover **server actions** (`src/actions/`) and **utilities** (`src/lib/`) only — no component tests. See @context/coding-standards.md for conventions.

## Neon MCP

- **Project ID:** `falling-salad-83557562`
- **Default branch:** `development` (`br-plain-smoke-ald1szfh`)
- **Production branch:** `production` (`br-spring-field-al118diy`)

Always use the development branch for all Neon MCP operations unless I explicitly say "production". Never run SQL or schema changes against the production branch without explicit confirmation.

## Stack

- **Next.js 16.2.4** (App Router) with **React 19**
- **TypeScript**
- **Tailwind CSS v4** — imported via `@import "tailwindcss"` in `globals.css`, configured through PostCSS (`@tailwindcss/postcss`)
- **Geist** fonts loaded via `next/font/google`, exposed as CSS variables `--font-geist-sans` / `--font-geist-mono`

