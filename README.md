# DevStash

> One fast, searchable, AI-enhanced hub for everything a developer stashes away.

Developers keep their essentials scattered across a dozen places — snippets in VS Code, prompts buried in chat histories, links forgotten in bookmarks, commands lost in bash history. **DevStash** solves this with a single hub for all developer knowledge and resources.

---

## 🗂️ What You Can Store

| Type | Description |
|---|---|
| **Snippets** | Reusable code blocks |
| **Prompts** | AI prompts and system messages |
| **Commands** | Terminal commands and scripts |
| **Notes** | Markdown notes and documentation |
| **Links** | Bookmarks and references |
| **Files** | Uploadable files *(Pro)* |
| **Images** | Screenshots and diagrams *(Pro)* |

Items can be grouped into **Collections**, tagged, pinned, and favorited.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Neon (Serverless PostgreSQL) |
| ORM | Prisma 7 |
| Auth | NextAuth v5 |
| File Storage | Cloudflare R2 |
| AI | OpenAI gpt-5-nano |
| Payments | Stripe |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) account and project
- A Neon API key from [console.neon.tech/app/settings/api-keys](https://console.neon.tech/app/settings/api-keys)

### 1️⃣ Clone and install

```bash
git clone https://github.com/michael-rayner92/devstash.git
cd devstash
npm install
```

### 2️⃣ Set up environment variables

Copy the example env file and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Neon PostgreSQL
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

### 3️⃣ Set up MCP servers (for AI-assisted development)

The project uses three MCP servers with Claude Code: **Neon** (database), **Context7** (docs), and **Playwright** (browser). Their API keys must be set in your shell profile — not in `.env.local`, as they are read at the shell level by Claude Code.

Add the following to your shell profile (`~/.zshrc` or `~/.zprofile`):

```bash
export NEON_API_KEY="napi_..."      # https://console.neon.tech/app/settings/api-keys
export CONTEXT7_API_KEY="ctx7sk-..." # https://context7.com
```

Then reload your shell:

```bash
source ~/.zshrc
```

The `.mcp.json` at the project root is already configured — Claude Code will automatically connect once the keys are set.

### 4️⃣ Run database migrations and seed

```bash
npx prisma migrate deploy
npx prisma db seed
```

This applies all migrations and seeds the system item types plus demo data.

### 5️⃣ Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧰 Useful Commands

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # Run ESLint
npx prisma studio  # Open Prisma Studio (database GUI)
```

---

## 🗄️ Database Migrations

This project uses **Prisma migrations only** — never `prisma db push`.

```bash
# Create a new migration (dev)
npx prisma migrate dev --name your-migration-name

# Apply migrations (production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

---

## 💰 Pricing Tiers

| Feature | Free | Pro ($8/mo) |
|---|---|---|
| Items | 50 total | Unlimited |
| Collections | 3 | Unlimited |
| File & image uploads | ❌ | ✅ |
| AI features | ❌ | ✅ |
| Data export | ❌ | ✅ |

> During development all features are unlocked regardless of tier.
