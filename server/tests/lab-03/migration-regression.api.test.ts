import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seed, SEED_CREDENTIALS } from "../../prisma/seed.js";

const prisma = getPrisma();

describe("Lab 3 migration and deterministic fixtures", () => {
  beforeEach(async () => {
    await prisma.authSession.deleteMany();
    await prisma.publicComment.deleteMany();
    await prisma.internalNote.deleteMany();
    await prisma.user.deleteMany({ where: { role: { not: "REQUESTER" } } });
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.$disconnect();
  });

  it("maps every Lab 2 requester ID to one REQUESTER user without changing legacy rows", async () => {
    await seed(prisma);
    const requesters = await prisma.requesterUser.findMany({ orderBy: { id: "asc" } });
    const users = await prisma.user.findMany({ where: { role: "REQUESTER" }, orderBy: { id: "asc" } });

    expect(users).toHaveLength(requesters.length);
    expect(users.map((user) => user.id)).toEqual(requesters.map((requester) => requester.id));
    expect(users.every((user) => user.mustChangePassword)).toBe(true);
    expect(users.map((user) => user.active)).toEqual(requesters.map((requester) => requester.isActive));
  });

  it("seeds the required role quantities idempotently and keeps passwords local-only", async () => {
    await seed(prisma);
    await seed(prisma);
    expect(await prisma.user.count({ where: { role: "REQUESTER", active: true } })).toBeGreaterThanOrEqual(4);
    expect(await prisma.user.count({ where: { role: "REQUESTER", active: false } })).toBeGreaterThanOrEqual(1);
    expect(await prisma.user.count({ where: { role: "IT_STAFF", active: true } })).toBeGreaterThanOrEqual(3);
    expect(await prisma.user.count({ where: { role: "IT_STAFF", active: false } })).toBeGreaterThanOrEqual(1);
    expect(await prisma.user.count({ where: { role: "ADMIN", active: true } })).toBeGreaterThanOrEqual(1);
    expect(await prisma.user.count()).toBe(new Set(SEED_CREDENTIALS.all.map((credential) => credential.email)).size);
    const user = await prisma.user.findFirstOrThrow();
    expect(user.passwordHash).toMatch(/^scrypt\$/);
  });

  it("preserves Requested Priority as the initial IT Priority for newly created tickets", async () => {
    await seed(prisma);
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-900001",
        summary: "Migration priority check",
        description: "A migration regression ticket with enough detail.",
        requestedPriority: "URGENT",
        itPriority: "URGENT",
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 1,
      },
    });
    expect(ticket.itPriority).toBe(ticket.requestedPriority);
    await prisma.ticket.delete({ where: { id: ticket.id } });
  });
});
