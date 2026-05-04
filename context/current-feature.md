# Current Feature

## Status

Complete

## Goals

## Notes

## History

<!-- Keep this updated. Earliest to latest -->

- **2026-04-16** — Initial Next.js + Tailwind CSS setup bootstrapped from `create-next-app`. Removed default placeholder assets, updated `globals.css` and `page.tsx`, added project context files and CLAUDE.md. Pushed to `https://github.com/michael-rayner92/devstash.git`.
- **2026-04-20** — Dashboard UI Phase 1 completed. ShadCN setup (manual install), `components.json`, `globals.css` updated with OKLCH color variables and Tailwind v4 `@theme inline` mapping, dark mode by default, `/dashboard` route with topbar (search + New item button), sidebar placeholder, and main area placeholder.
- **2026-04-20** — Dashboard UI Phase 2 completed. Collapsible sidebar (desktop toggle via `PanelLeft` button, smooth width transition), item type links to `/items/[type]s`, favorites and recent collections sections, user avatar area with initials/tier badge, mobile-always-drawer via Radix Dialog-based `Sheet` component. `DashboardShell` client component wraps all dashboard routes via `layout.tsx`.
- **2026-04-20** — Dashboard UI Phase 3 completed. Main content area with greeting, 4 stats cards (items, collections, favorites, AI credits), recent collections grid with type-colored gradient cards, pinned items section, and recent items list. `CollectionCard` and `ItemRow` components created. Gradient effect added to collection cards matching reference screenshot.
- **2026-04-27** — Prisma 7 + Neon PostgreSQL setup completed. Schema with all models + NextAuth, initial migration applied, system ItemTypes seeded. `ws` required for Node.js WebSocket support with Neon serverless driver.
- **2026-04-27** — Dashboard collections wired to real DB. Created `src/lib/db/collections.ts` with `getRecentCollections` (dominant type + all types computed per collection) and `getDashboardStats`. Updated `CollectionCard` to accept real DB types and show secondary type icons. Dashboard page is now async, fetches demo user by email, and renders live stats and collections from Neon.
- **2026-04-27** — Demo seed data completed. `prisma/seed.ts` updated with demo user (`demo@devstash.io`), 7 system item types upserted, and 5 collections seeded (React Patterns, AI Workflows, DevOps, Terminal Commands, Design Resources) with 18 items total. `scripts/test-db.ts` updated to verify all seeded data.
- **2026-04-27** — Dashboard items wired to real DB. Created `src/lib/db/items.ts` with `getPinnedItems` and `getRecentItems`. Updated `ItemRow` to accept Prisma `ItemWithType` (drops mock data types, tags rendered from `Tag[]`). Dashboard page fetches all four data sources in parallel; pinned section hidden when empty. All mock data removed from dashboard.
- **2026-04-27** — Stats & sidebar wired to real DB. Created `src/lib/db/sidebar.ts` with `getSidebarItemTypes` and `getSidebarCollections`. Dashboard layout now fetches sidebar data server-side and passes to `DashboardShell` → `SidebarContent`. Sidebar item types driven from DB with Tailwind `capitalize`. Collections section unified with nested Favourites (star icon) and Recent (dominant-type colored circle) sub-groups, plus "View all collections" link. Seed updated with pinned/favorited items and two favorite collections; DB reset and reseeded.
- **2026-05-04** — PRO badge added to sidebar. Created `src/components/ui/badge.tsx` (ShadCN Badge, manual install). Replaced Lock icon on Files and Images item types with a clean, subtle secondary-variant Badge showing "PRO" in uppercase.
- **2026-05-04** — Code quality quick wins from scanner audit. Added `url = env("DATABASE_URL")` to Prisma schema; extracted shared `iconMap`, `relativeTime`, `getInitials` (+ edge case fix) to `src/lib/`; extracted `StatsCard` to `src/components/dashboard/`; dynamic time-based greeting; seed idempotency via delete-then-create; `aria-label` on sidebar button; replaced all `React.X` namespace type references with explicit `import type` statements; added React import convention to coding-standards.md.
