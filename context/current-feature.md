# Current Feature

## Status

## Goals

## Notes

## History

<!-- Keep this updated. Earliest to latest -->

- **2026-04-16** — Initial Next.js + Tailwind CSS setup bootstrapped from `create-next-app`. Removed default placeholder assets, updated `globals.css` and `page.tsx`, added project context files and CLAUDE.md. Pushed to `https://github.com/michael-rayner92/devstash.git`.
- **2026-04-20** — Dashboard UI Phase 1 completed. ShadCN setup (manual install), `components.json`, `globals.css` updated with OKLCH color variables and Tailwind v4 `@theme inline` mapping, dark mode by default, `/dashboard` route with topbar (search + New item button), sidebar placeholder, and main area placeholder.
- **2026-04-20** — Dashboard UI Phase 2 completed. Collapsible sidebar (desktop toggle via `PanelLeft` button, smooth width transition), item type links to `/items/[type]s`, favorites and recent collections sections, user avatar area with initials/tier badge, mobile-always-drawer via Radix Dialog-based `Sheet` component. `DashboardShell` client component wraps all dashboard routes via `layout.tsx`.
- **2026-04-20** — Dashboard UI Phase 3 completed. Main content area with greeting, 4 stats cards (items, collections, favorites, AI credits), recent collections grid with type-colored gradient cards, pinned items section, and recent items list. `CollectionCard` and `ItemRow` components created. Gradient effect added to collection cards matching reference screenshot.
- **2026-04-27** — Prisma 7 + Neon PostgreSQL setup completed. Schema with all models + NextAuth, initial migration applied, system ItemTypes seeded. `ws` required for Node.js WebSocket support with Neon serverless driver.
- **2026-04-27** — Demo seed data completed. `prisma/seed.ts` updated with demo user (`demo@devstash.io`), 7 system item types upserted, and 5 collections seeded (React Patterns, AI Workflows, DevOps, Terminal Commands, Design Resources) with 18 items total. `scripts/test-db.ts` updated to verify all seeded data.
