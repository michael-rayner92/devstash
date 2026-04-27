import { PrismaClient } from "../src/generated/prisma/client.js";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import ws from "ws";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const SYSTEM_ITEM_TYPES = [
  { name: "snippet", icon: "Code", color: "#3b82f6", isSystem: true },
  { name: "prompt", icon: "Sparkles", color: "#8b5cf6", isSystem: true },
  { name: "command", icon: "Terminal", color: "#f97316", isSystem: true },
  { name: "note", icon: "StickyNote", color: "#fde047", isSystem: true },
  { name: "link", icon: "Link", color: "#10b981", isSystem: true },
  { name: "file", icon: "File", color: "#6b7280", isSystem: true },
  { name: "image", icon: "Image", color: "#ec4899", isSystem: true },
];

async function main() {
  console.log("Seeding system item types...");

  for (const type of SYSTEM_ITEM_TYPES) {
    const existing = await prisma.itemType.findFirst({
      where: { isSystem: true, name: type.name },
    });
    if (existing) {
      await prisma.itemType.update({
        where: { id: existing.id },
        data: { icon: type.icon, color: type.color },
      });
    } else {
      await prisma.itemType.create({ data: { ...type, userId: null } });
    }
  }

  console.log(`Seeded ${SYSTEM_ITEM_TYPES.length} system item types.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
