import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { afterAll, describe, expect, it } from "vitest";

const testEnvPath = resolve(process.cwd(), ".env.test");
if (!existsSync(testEnvPath)) throw new Error("Missing server/.env.test for Lab 4 seed verification");
const loaded = config({ path: testEnvPath });
if (loaded.error) throw new Error("Unable to load guarded Lab 4 test database configuration");
const databaseUrl = process.env.DATABASE_URL;
const databaseName = databaseUrl ? new URL(databaseUrl).pathname.split("/").filter(Boolean).at(-1) : undefined;
if (!databaseName?.toLowerCase().endsWith("_test")) throw new Error("Refusing seed verification outside a dedicated _test database");

describe("Issue #52 Actions Taken seed idempotency", () => {
  let prisma: import("@prisma/client").PrismaClient | undefined;
  let seed: typeof import("../../prisma/seed.js")["seed"];

  afterAll(async () => {
    if (prisma) {
      await prisma.ticket.deleteMany({ where: { ticketNumber: "TKT-2026-520099" } });
      await prisma.$disconnect();
    }
  });

  it("upserts every status and priority with zero/one/many Actions without duplicating fixture rows", async () => {
    const prismaModule = await import("../../src/prisma.js");
    const seedModule = await import("../../prisma/seed.js");
    prisma = prismaModule.getPrisma();
    seed = seedModule.seed;

    const requester = await prisma.user.findUniqueOrThrow({ where: { email: "jennifer.anderson@example.com" }, select: { id: true } });
    const category = await prisma.category.findUniqueOrThrow({ where: { name: "Account and Access" }, select: { id: true } });
    const relatedSystem = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Email" }, select: { id: true } });
    const userCreatedTicket = await prisma.ticket.create({ data: {
      ticketNumber: "TKT-2026-520099",
      summary: "User created Lab 4 seed regression fixture",
      description: "This row verifies the seed keeps user-created tickets.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      requesterId: requester.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
    } });

    await seed(prisma);
    const tickets = await prisma.ticket.findMany({
      where: { ticketNumber: { startsWith: "TKT-2026-98000" } },
      orderBy: { ticketNumber: "asc" },
      include: { actions: { select: { id: true, state: true, assigneeId: true, performedById: true } } },
    });
    expect(tickets).toHaveLength(8);
    expect(new Set(tickets.map((ticket) => ticket.currentStatus))).toEqual(new Set([
      "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED",
    ]));
    expect(new Set(tickets.map((ticket) => ticket.requestedPriority))).toEqual(new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]));
    expect(tickets.map((ticket) => ticket.actions.length)).toEqual([0, 1, 2, 1, 1, 1, 1, 1]);
    expect(tickets.some((ticket) => ticket.ownerId === null)).toBe(true);
    expect(tickets.some((ticket) => ticket.ownerId !== null)).toBe(true);
    expect(tickets.flatMap((ticket) => ticket.actions).some((action) => action.assigneeId === null)).toBe(true);
    expect(tickets.flatMap((ticket) => ticket.actions).some((action) => action.assigneeId !== null)).toBe(true);
    expect(new Set(tickets.flatMap((ticket) => ticket.actions.map((action) => action.state)))).toEqual(new Set(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]));

    const actionCount = tickets.reduce((count, ticket) => count + ticket.actions.length, 0);
    expect(await prisma.actionTaken.count({ where: { ticketId: { in: tickets.map((ticket) => ticket.id) } } })).toBe(actionCount);

    const editedFixture = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-2026-980001" } });
    const staffOwner = await prisma.user.findUniqueOrThrow({ where: { email: "alex.staff@example.com" }, select: { id: true } });
    await prisma.ticket.update({
      where: { id: editedFixture.id },
      data: {
        currentStatus: "CLOSED",
        ownerId: staffOwner.id,
        description: "Edited after the initial Lab 4 seed run",
      },
    });
    await seed(prisma);
    expect(await prisma.ticket.findUnique({ where: { id: userCreatedTicket.id }, select: { id: true } })).toEqual({ id: userCreatedTicket.id });
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: editedFixture.id }, select: { currentStatus: true, ownerId: true, description: true } })).toEqual({
      currentStatus: "CLOSED",
      ownerId: staffOwner.id,
      description: "Edited after the initial Lab 4 seed run",
    });
    expect(await prisma.actionTaken.count({ where: { ticketId: { in: tickets.map((ticket) => ticket.id) } } })).toBe(actionCount);
  });
});
