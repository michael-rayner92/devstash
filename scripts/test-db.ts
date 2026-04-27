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

  const itemTypes = await prisma.itemType.findMany({
    orderBy: { name: "asc" },
  });

  console.log(`Connected! Found ${itemTypes.length} system item types:`);
  for (const type of itemTypes) {
    console.log(`  - ${type.name} (${type.icon}, ${type.color})`);
  }
}

main()
  .catch((e) => {
    console.error("Database connection failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
