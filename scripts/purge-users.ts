import { PrismaClient } from "../src/generated/prisma/client.js";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "dotenv";
import ws from "ws";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PRESERVE_EMAIL = "demo@devstash.io";

async function main() {
  const preserved = await prisma.user.findUnique({ where: { email: PRESERVE_EMAIL } });

  if (!preserved) {
    console.error(`Preserved user ${PRESERVE_EMAIL} not found — aborting.`);
    process.exit(1);
  }

  const targets = await prisma.user.findMany({
    where: { email: { not: PRESERVE_EMAIL } },
    select: { id: true, email: true },
  });

  if (targets.length === 0) {
    console.log("No users to delete.");
    return;
  }

  console.log(`Found ${targets.length} user(s) to delete:`);
  targets.forEach((u) => console.log(`  - ${u.email} (${u.id})`));
  console.log();

  const ids = targets.map((u) => u.id);

  // Delete in dependency order. Cascade handles most relations but
  // explicit deletes make the output clear and avoid FK ordering issues.
  const [tokens, accounts, sessions, itemCollections, tags, items, collections, customTypes] =
    await prisma.$transaction([
      prisma.emailVerificationToken.deleteMany({ where: { userId: { in: ids } } }),
      prisma.account.deleteMany({ where: { userId: { in: ids } } }),
      prisma.session.deleteMany({ where: { userId: { in: ids } } }),
      prisma.itemCollection.deleteMany({ where: { item: { userId: { in: ids } } } }),
      prisma.tag.deleteMany({ where: { userId: { in: ids } } }),
      prisma.item.deleteMany({ where: { userId: { in: ids } } }),
      prisma.collection.deleteMany({ where: { userId: { in: ids } } }),
      prisma.itemType.deleteMany({ where: { userId: { in: ids } } }),
    ]);

  const users = await prisma.user.deleteMany({ where: { id: { in: ids } } });

  console.log("Deleted:");
  console.log(`  ${users.count} user(s)`);
  console.log(`  ${items.count} item(s)`);
  console.log(`  ${collections.count} collection(s)`);
  console.log(`  ${tags.count} tag(s)`);
  console.log(`  ${customTypes.count} custom item type(s)`);
  console.log(`  ${itemCollections.count} item-collection link(s)`);
  console.log(`  ${accounts.count} OAuth account(s)`);
  console.log(`  ${sessions.count} session(s)`);
  console.log(`  ${tokens.count} verification token(s)`);
  console.log(`\nPreserved: ${PRESERVE_EMAIL}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
