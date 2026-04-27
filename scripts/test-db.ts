import { PrismaClient } from "../src/generated/prisma/client.js";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import ws from "ws";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Testing database connection...\n");

  // System item types
  const itemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
    orderBy: { name: "asc" },
  });
  console.log(`System item types (${itemTypes.length}):`);
  for (const t of itemTypes) {
    console.log(`  ${t.name.padEnd(10)} icon=${t.icon.padEnd(12)} color=${t.color}`);
  }

  // Demo user
  const user = await prisma.user.findUnique({
    where: { email: "demo@devstash.io" },
  });
  if (!user) {
    console.log("\n⚠  Demo user not found — run npm run db:seed first.");
    return;
  }
  console.log(`\nDemo user: ${user.name} <${user.email}> (isPro=${user.isPro}, emailVerified=${user.emailVerified?.toISOString() ?? "null"})`);

  // Collections + items
  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      items: {
        include: {
          item: {
            include: { itemType: true },
          },
        },
        orderBy: { addedAt: "asc" },
      },
    },
  });

  console.log(`\nCollections (${collections.length}):`);
  for (const col of collections) {
    console.log(`\n  [${col.name}] — ${col.description}`);
    for (const { item } of col.items) {
      const type = item.itemType.name.padEnd(10);
      const content =
        item.contentType === "url"
          ? item.url ?? ""
          : (item.content ?? "").split("\n")[0].slice(0, 60);
      console.log(`    • (${type}) ${item.title}`);
      console.log(`      ${content}`);
    }
  }

  const totalItems = collections.reduce((n, c) => n + c.items.length, 0);
  console.log(`\nTotal: ${collections.length} collections, ${totalItems} items.`);
}

main()
  .catch((e) => {
    console.error("Database connection failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
