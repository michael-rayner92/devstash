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
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build
npm run lint     # run ESLint
```

There is no test suite configured.

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

