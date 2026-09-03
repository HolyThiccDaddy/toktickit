import { config } from "dotenv";
import { resolve } from "node:path";

export default async function setup() {
  const envPath = resolve(process.cwd(), ".env.test");
  const result = config({ path: envPath });
  if (result.error) throw new Error(`Unable to load server/.env.test: ${result.error.message}`);

  const databaseUrl = process.env.DATABASE_URL;
  const databaseName = databaseUrl
    ? new URL(databaseUrl).pathname.split("/").filter(Boolean).at(-1)
    : undefined;
  if (!databaseName?.toLowerCase().endsWith("_test")) {
    throw new Error("Refusing to prepare tests without a dedicated _test database.");
  }

  const { getPrisma } = await import("../src/prisma.js");
  const { seed } = await import("../prisma/seed.js");
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Attachment", "Ticket", "TicketCounter", "RequesterUser", "RelatedSystem", "Category"
    RESTART IDENTITY CASCADE
  `);
  await seed(prisma);
  await prisma.$disconnect();
}
