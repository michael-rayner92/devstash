import { PrismaClient, ContentType } from "../src/generated/prisma/client.js";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import ws from "ws";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const SYSTEM_ITEM_TYPES = [
  { name: "snippet", icon: "Code", color: "#3b82f6" },
  { name: "prompt", icon: "Sparkles", color: "#8b5cf6" },
  { name: "command", icon: "Terminal", color: "#f97316" },
  { name: "note", icon: "StickyNote", color: "#fde047" },
  { name: "file", icon: "File", color: "#6b7280" },
  { name: "image", icon: "Image", color: "#ec4899" },
  { name: "link", icon: "Link", color: "#10b981" },
];

async function upsertSystemTypes() {
  const typeMap: Record<string, string> = {};
  for (const type of SYSTEM_ITEM_TYPES) {
    const existing = await prisma.itemType.findFirst({
      where: { isSystem: true, name: type.name },
    });
    let record;
    if (existing) {
      record = await prisma.itemType.update({
        where: { id: existing.id },
        data: { icon: type.icon, color: type.color },
      });
    } else {
      record = await prisma.itemType.create({
        data: { ...type, isSystem: true, userId: null },
      });
    }
    typeMap[type.name] = record.id;
  }
  console.log(`Upserted ${SYSTEM_ITEM_TYPES.length} system item types.`);
  return typeMap;
}

async function upsertDemoUser() {
  const email = "demo@devstash.io";
  const passwordHash = await bcrypt.hash("12345678", 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo User",
      isPro: false,
      emailVerified: new Date(),
      // NextAuth expects password via a credentials Account record, but we
      // store the hash directly on the user for the credentials provider.
      // We'll use the `image` field pattern — this will be wired to auth later.
      // For now, store nothing; the hash is used when auth is implemented.
    },
  });

  // Store hashed password in a separate Account record scoped to credentials
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "credentials",
        providerAccountId: email,
      },
    },
  });
  if (!existingAccount) {
    await prisma.account.create({
      data: {
        userId: user.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: email,
        // Store hash in refresh_token for retrieval during auth
        refresh_token: passwordHash,
      },
    });
  }

  console.log(`Upserted demo user: ${email}`);
  return user;
}

async function seedCollections(
  userId: string,
  typeMap: Record<string, string>
) {
  // Wipe existing seed data so re-running the seed stays idempotent
  await prisma.item.deleteMany({ where: { userId } });
  await prisma.collection.deleteMany({ where: { userId } });

  // ── React Patterns ──────────────────────────────────────────────────────
  const reactPatterns = await prisma.collection.create({
    data: {
      name: "React Patterns",
      description: "Reusable React patterns and hooks",
      isFavorite: true,
      userId,
    },
  });

  const reactItems = [
    {
      title: "useDebounce & useLocalStorage hooks",
      description: "Custom hooks for debouncing values and persisting state",
      contentType: ContentType.text,
      isPinned: true,
      isFavorite: true,
      language: "typescript",
      content: `import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    setStoredValue(value);
    window.localStorage.setItem(key, JSON.stringify(value));
  };

  return [storedValue, setValue] as const;
}`,
      itemTypeId: typeMap.snippet,
      userId,
    },
    {
      title: "Context Provider + Compound Components",
      description: "Pattern for sharing state via context with compound components",
      contentType: ContentType.text,
      language: "typescript",
      content: `import { createContext, useContext, useState, ReactNode } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs must be used within <Tabs>');
  return ctx;
}

function Tabs({ children, defaultTab }: { children: ReactNode; defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}

function Tab({ id, children }: { id: string; children: ReactNode }) {
  const { activeTab, setActiveTab } = useTabs();
  return (
    <button
      className={activeTab === id ? 'active' : ''}
      onClick={() => setActiveTab(id)}
    >
      {children}
    </button>
  );
}

Tabs.Tab = Tab;
export { Tabs };`,
      itemTypeId: typeMap.snippet,
      userId,
    },
    {
      title: "Utility functions (cn, formatDate, truncate)",
      description: "Common utility helpers for React projects",
      contentType: ContentType.text,
      language: "typescript",
      content: `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}`,
      itemTypeId: typeMap.snippet,
      userId,
    },
  ];

  for (const item of reactItems) {
    const created = await prisma.item.create({ data: item });
    await prisma.itemCollection.create({
      data: { itemId: created.id, collectionId: reactPatterns.id },
    });
  }
  console.log(`Seeded collection: ${reactPatterns.name}`);

  // ── AI Workflows ─────────────────────────────────────────────────────────
  const aiWorkflows = await prisma.collection.create({
    data: {
      name: "AI Workflows",
      description: "AI prompts and workflow automations",
      isFavorite: true,
      userId,
    },
  });

  const aiItems = [
    {
      title: "Code Review Prompt",
      description: "Thorough code review prompt for LLMs",
      contentType: ContentType.text,
      isFavorite: true,
      content: `You are a senior software engineer performing a code review. Review the following code and provide feedback on:

1. **Correctness** — Does the logic do what it intends to? Are there edge cases?
2. **Security** — Any vulnerabilities (injection, auth bypass, data exposure)?
3. **Performance** — Unnecessary re-renders, N+1 queries, memory leaks?
4. **Readability** — Is the code easy to understand? Are names clear?
5. **Best practices** — Does it follow the conventions of the language/framework?

For each issue found, explain:
- What the problem is
- Why it matters
- A concrete suggestion or fix

Be direct and constructive. Start with the most critical issues.

Code to review:
\`\`\`
{CODE}
\`\`\``,
      itemTypeId: typeMap.prompt,
      userId,
    },
    {
      title: "Documentation Generator",
      description: "Generate JSDoc/TSDoc comments for functions",
      contentType: ContentType.text,
      content: `Generate comprehensive documentation for the following function. Output only the documentation comment (JSDoc/TSDoc format), no explanations outside the comment block.

Include:
- A one-line summary
- @param tags for every parameter (type + description)
- @returns tag describing the return value and type
- @throws tag if applicable
- A brief @example showing typical usage

Function:
\`\`\`
{FUNCTION_CODE}
\`\`\``,
      itemTypeId: typeMap.prompt,
      userId,
    },
    {
      title: "Refactoring Assistant",
      description: "Prompt to improve code quality without changing behavior",
      contentType: ContentType.text,
      content: `Refactor the following code to improve its quality. Do NOT change the external behavior or API.

Focus on:
- Removing duplication (DRY)
- Simplifying complex conditionals
- Improving naming for clarity
- Breaking down large functions
- Applying relevant design patterns where they genuinely help

Rules:
- Keep the same language and framework
- Do not add new features
- Do not change function signatures unless there is a compelling reason
- Output only the refactored code, then a brief bullet list of what you changed and why

Code:
\`\`\`
{CODE}
\`\`\``,
      itemTypeId: typeMap.prompt,
      userId,
    },
  ];

  for (const item of aiItems) {
    const created = await prisma.item.create({ data: item });
    await prisma.itemCollection.create({
      data: { itemId: created.id, collectionId: aiWorkflows.id },
    });
  }
  console.log(`Seeded collection: ${aiWorkflows.name}`);

  // ── DevOps ────────────────────────────────────────────────────────────────
  const devops = await prisma.collection.create({
    data: {
      name: "DevOps",
      description: "Infrastructure and deployment resources",
      userId,
    },
  });

  const devopsItems = [
    {
      title: "Docker + GitHub Actions CI/CD",
      description: "Multi-stage Dockerfile with GitHub Actions workflow",
      contentType: ContentType.text,
      isPinned: true,
      language: "dockerfile",
      content: `# Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

# .github/workflows/deploy.yml
# name: Deploy
# on:
#   push:
#     branches: [main]
# jobs:
#   deploy:
#     runs-on: ubuntu-latest
#     steps:
#       - uses: actions/checkout@v4
#       - uses: docker/build-push-action@v5
#         with:
#           push: true
#           tags: ghcr.io/$\{\{ github.repository \}\}:latest`,
      itemTypeId: typeMap.snippet,
      userId,
    },
    {
      title: "Deploy to production",
      description: "SSH into server, pull latest image, restart containers",
      contentType: ContentType.text,
      content: `ssh deploy@$SERVER_HOST "cd /opt/app && docker compose pull && docker compose up -d --remove-orphans && docker image prune -f"`,
      itemTypeId: typeMap.command,
      userId,
    },
    {
      title: "Docker Documentation",
      description: "Official Docker docs",
      contentType: ContentType.url,
      url: "https://docs.docker.com",
      itemTypeId: typeMap.link,
      userId,
    },
    {
      title: "GitHub Actions Docs",
      description: "Official GitHub Actions documentation",
      contentType: ContentType.url,
      url: "https://docs.github.com/en/actions",
      itemTypeId: typeMap.link,
      userId,
    },
  ];

  for (const item of devopsItems) {
    const created = await prisma.item.create({ data: item });
    await prisma.itemCollection.create({
      data: { itemId: created.id, collectionId: devops.id },
    });
  }
  console.log(`Seeded collection: ${devops.name}`);

  // ── Terminal Commands ─────────────────────────────────────────────────────
  const terminalCommands = await prisma.collection.create({
    data: {
      name: "Terminal Commands",
      description: "Useful shell commands for everyday development",
      userId,
    },
  });

  const commandItems = [
    {
      title: "Git: undo last commit (keep changes)",
      description: "Soft reset to unstage the last commit",
      contentType: ContentType.text,
      content: `git reset --soft HEAD~1`,
      itemTypeId: typeMap.command,
      userId,
    },
    {
      title: "Docker: clean up everything",
      description: "Remove all stopped containers, dangling images, unused networks",
      contentType: ContentType.text,
      content: `docker system prune -af --volumes`,
      itemTypeId: typeMap.command,
      userId,
    },
    {
      title: "Find and kill process on port",
      description: "Find what's using a port and kill it (macOS/Linux)",
      contentType: ContentType.text,
      isFavorite: true,
      content: `lsof -ti tcp:3000 | xargs kill -9`,
      itemTypeId: typeMap.command,
      userId,
    },
    {
      title: "npm: audit and fix vulnerabilities",
      description: "Run security audit and auto-fix safe updates",
      contentType: ContentType.text,
      content: `npm audit && npm audit fix`,
      itemTypeId: typeMap.command,
      userId,
    },
  ];

  for (const item of commandItems) {
    const created = await prisma.item.create({ data: item });
    await prisma.itemCollection.create({
      data: { itemId: created.id, collectionId: terminalCommands.id },
    });
  }
  console.log(`Seeded collection: ${terminalCommands.name}`);

  // ── Design Resources ──────────────────────────────────────────────────────
  const designResources = await prisma.collection.create({
    data: {
      name: "Design Resources",
      description: "UI/UX resources and references",
      userId,
    },
  });

  const linkItems = [
    {
      title: "Tailwind CSS Docs",
      description: "Official Tailwind CSS documentation and utility reference",
      contentType: ContentType.url,
      url: "https://tailwindcss.com/docs",
      itemTypeId: typeMap.link,
      userId,
    },
    {
      title: "shadcn/ui",
      description: "Beautifully designed components built with Radix UI and Tailwind",
      contentType: ContentType.url,
      isFavorite: true,
      url: "https://ui.shadcn.com",
      itemTypeId: typeMap.link,
      userId,
    },
    {
      title: "Radix UI Primitives",
      description: "Unstyled, accessible component primitives for React",
      contentType: ContentType.url,
      url: "https://www.radix-ui.com",
      itemTypeId: typeMap.link,
      userId,
    },
    {
      title: "Lucide Icons",
      description: "Open-source icon library used throughout this project",
      contentType: ContentType.url,
      url: "https://lucide.dev",
      itemTypeId: typeMap.link,
      userId,
    },
  ];

  for (const item of linkItems) {
    const created = await prisma.item.create({ data: item });
    await prisma.itemCollection.create({
      data: { itemId: created.id, collectionId: designResources.id },
    });
  }
  console.log(`Seeded collection: ${designResources.name}`);
}

async function main() {
  console.log("Starting seed...\n");

  const typeMap = await upsertSystemTypes();
  const user = await upsertDemoUser();
  await seedCollections(user.id, typeMap);

  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
