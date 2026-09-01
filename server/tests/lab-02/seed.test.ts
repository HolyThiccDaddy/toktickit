import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const testEnvPath = resolve(process.cwd(), ".env.test");

if (!existsSync(testEnvPath)) {
  throw new Error(
    "Missing server/.env.test. Copy server/.env.test.example to server/.env.test before running Lab 2 database tests.",
  );
}

const loadResult = config({ path: testEnvPath });
if (loadResult.error) {
  throw new Error(`Unable to load server/.env.test: ${loadResult.error.message}`);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be defined in server/.env.test.");
}

const databaseName = new URL(databaseUrl).pathname
  .split("/")
  .filter(Boolean)
  .at(-1);

if (!databaseName?.toLowerCase().endsWith("_test")) {
  throw new Error(
    `Refusing to run destructive seed tests against non-test database: ${
      databaseName ?? "unknown"
    }`,
  );
}

describe("Database Seed Idempotency & Verification (Lab 2)", () => {
  let prisma: PrismaClient;
  let seed: (client: PrismaClient) => Promise<{
    categoriesCount: number;
    relatedSystemsCount: number;
    requestersCount: number;
  }>;

  beforeAll(async () => {
    // Import Prisma only after loading and validating the dedicated test DB.
    const prismaModule = await import("../../src/prisma.js");
    const seedModule = await import("../../prisma/seed.js");

    prisma = prismaModule.getPrisma();
    seed = seedModule.seed;

    // Prepare deterministic fixtures only inside the guarded test database.
    // RESTART IDENTITY keeps legacy assertions that rely on seeded IDs stable
    // even when the suite is run repeatedly against the same test database.
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "Attachment",
        "Ticket",
        "TicketCounter",
        "RequesterUser",
        "RelatedSystem",
        "Category"
      RESTART IDENTITY CASCADE
    `);

    // Run seed twice to test idempotency
    await seed(prisma);
    await seed(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("should seed exactly 4 categories without duplicates", async () => {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    expect(categories).toHaveLength(4);
    
    const categoryNames = categories.map((c) => c.name);
    expect(categoryNames).toEqual([
      "Account and Access",
      "Hardware",
      "Network",
      "Software",
    ]);
  });

  it("should seed at least 6 related systems (7 seeded) without duplicates", async () => {
    const systems = await prisma.relatedSystem.findMany({ orderBy: { name: "asc" } });
    expect(systems.length).toBeGreaterThanOrEqual(6);
    expect(systems).toHaveLength(7);

    const systemNames = systems.map((s) => s.name);
    expect(systemNames).toEqual([
      "Campus Wi-Fi",
      "Corporate Laptop",
      "Email",
      "Grade Submission App",
      "LEB2 App",
      "Printer",
      "VPN",
    ]);
  });

  it("should seed exactly 5 requester users (4 active, 1 inactive)", async () => {
    const requesters = await prisma.requesterUser.findMany({ orderBy: { email: "asc" } });
    expect(requesters).toHaveLength(5);

    const activeRequesters = requesters.filter((r) => r.isActive);
    const inactiveRequesters = requesters.filter((r) => !r.isActive);

    expect(activeRequesters).toHaveLength(4);
    expect(inactiveRequesters).toHaveLength(1);
    expect(inactiveRequesters[0].name).toBe("Robert Taylor");
    expect(inactiveRequesters[0].email).toBe("robert.taylor@example.com");
  });

  it("should initialize TicketCounter for the current year", async () => {
    const currentYear = new Date().getFullYear();
    const counter = await prisma.ticketCounter.findUnique({
      where: { year: currentYear },
    });

    expect(counter).not.toBeNull();
    expect(counter?.year).toBe(currentYear);
    expect(counter?.lastSequence).toBe(0);
  });

  it("should preserve lastSequence on an existing TicketCounter when re-seeded", async () => {
    const currentYear = new Date().getFullYear();
    // Simulate an existing counter where tickets were already issued (e.g. lastSequence = 5)
    await prisma.ticketCounter.update({
      where: { year: currentYear },
      data: { lastSequence: 5 },
    });

    // Run seed again
    await seed(prisma);

    // Verify lastSequence is still 5, not reset to 0
    const counter = await prisma.ticketCounter.findUnique({
      where: { year: currentYear },
    });
    expect(counter?.lastSequence).toBe(5);

    // Reset back to 0 for subsequent test suites
    await prisma.ticketCounter.update({
      where: { year: currentYear },
      data: { lastSequence: 0 },
    });
  });

  it("should remain idempotent when run multiple times", async () => {
    const result = await seed(prisma);
    expect(result.categoriesCount).toBe(4);
    expect(result.relatedSystemsCount).toBe(7);
    expect(result.requestersCount).toBe(5);

    const totalCategories = await prisma.category.count();
    const totalSystems = await prisma.relatedSystem.count();
    const totalRequesters = await prisma.requesterUser.count();

    expect(totalCategories).toBe(4);
    expect(totalSystems).toBe(7);
    expect(totalRequesters).toBe(5);
  });
});
