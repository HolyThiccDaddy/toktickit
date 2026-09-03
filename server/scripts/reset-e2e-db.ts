import { config } from "dotenv";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), process.env.DOTENV_CONFIG_PATH ?? ".env.test");
const loaded = config({ path: envPath });
if (loaded.error) throw new Error(`Unable to load ${envPath}: ${loaded.error.message}`);

const databaseUrl = process.env.DATABASE_URL;
const databaseName = databaseUrl
  ? new URL(databaseUrl).pathname.split("/").filter(Boolean).at(-1)
  : undefined;
if (!databaseName?.toLowerCase().endsWith("_test")) {
  throw new Error("Refusing to reset E2E data without a dedicated _test database.");
}

const { getPrisma } = await import("../src/prisma.js");
const { seed } = await import("../prisma/seed.js");
const prisma = getPrisma();

try {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Attachment", "Ticket", "TicketCounter", "RequesterUser", "RelatedSystem", "Category"
    RESTART IDENTITY CASCADE
  `);
  await seed(prisma);
  console.log(`Prepared deterministic E2E fixtures in ${databaseName}.`);
} finally {
  await prisma.$disconnect();
}
