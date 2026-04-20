# Current Feature

Dashboard UI Phase 3 — Main area with stats cards, recent collections, pinned items, and recent items.

## Status

In Progress

## Goals

- 4 stats cards: total items, collections, favorite items, favorite collections
- Recent collections section
- Pinned items section
- 10 most recent items

## Notes

- Reference screenshot: `@context/screenshots/dashboard-ui-main.png`
- Use mock data from `@src/lib/mock-data.ts` (import directly)
- Stats cards are not in the screenshot — add them at the top
- See also: `@context/features/dashboard-phase-1-spec.md` and `@context/features/dashboard-phase-2-spec.md`

## History

<!-- Keep this updated. Earliest to latest -->

- **2026-04-16** — Initial Next.js + Tailwind CSS setup bootstrapped from `create-next-app`. Removed default placeholder assets, updated `globals.css` and `page.tsx`, added project context files and CLAUDE.md. Pushed to `https://github.com/michael-rayner92/devstash.git`.
- **2026-04-20** — Dashboard UI Phase 1 completed. ShadCN setup (manual install), `components.json`, `globals.css` updated with OKLCH color variables and Tailwind v4 `@theme inline` mapping, dark mode by default, `/dashboard` route with topbar (search + New item button), sidebar placeholder, and main area placeholder.
- **2026-04-20** — Dashboard UI Phase 2 completed. Collapsible sidebar (desktop toggle via `PanelLeft` button, smooth width transition), item type links to `/items/[type]s`, favorites and recent collections sections, user avatar area with initials/tier badge, mobile-always-drawer via Radix Dialog-based `Sheet` component. `DashboardShell` client component wraps all dashboard routes via `layout.tsx`.
