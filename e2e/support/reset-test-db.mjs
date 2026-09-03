import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const envPath = resolve(repoRoot, "server", process.env.DOTENV_CONFIG_PATH ?? ".env.test");
const envText = await readFile(envPath, "utf8");
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match) continue;
  const value = match[2].replace(/^(["'])(.*)\1$/, "$2");
  if (process.env[match[1]] === undefined) process.env[match[1]] = value;
}

const databaseUrl = process.env.DATABASE_URL;
const databaseName = databaseUrl
  ? new URL(databaseUrl).pathname.split("/").filter(Boolean).at(-1)
  : undefined;
if (!databaseName?.toLowerCase().endsWith("_test")) {
  throw new Error("Refusing to reset E2E data without a dedicated _test database.");
}

const { getPrisma } = await import(pathToFileURL(resolve(repoRoot, "server/dist/src/prisma.js")).href);
const { seed } = await import(pathToFileURL(resolve(repoRoot, "server/dist/prisma/seed.js")).href);
const prisma = getPrisma();
try {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Attachment", "Ticket", "TicketCounter", "RequesterUser", "RelatedSystem", "Category"
    RESTART IDENTITY CASCADE
  `);
  await seed(prisma);
  await rm(resolve(repoRoot, "server", process.env.TOKTICKIT_UPLOAD_ROOT ?? "tmp/e2e-uploads"), { recursive: true, force: true });
  console.log(`Prepared deterministic E2E fixtures in ${databaseName}.`);
} finally {
  await prisma.$disconnect();
}
