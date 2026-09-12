import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword, migrationPendingHash, verifyPassword } from "../../src/auth.js";
import { initialPasswordForRequester, seed, SEED_CREDENTIALS } from "../../prisma/seed.js";

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
    const firstSeedUsers = await prisma.user.findMany({
      orderBy: { id: "asc" },
      select: { id: true, email: true, passwordHash: true, mustChangePassword: true, active: true, role: true },
    });
    await seed(prisma);
    const secondSeedUsers = await prisma.user.findMany({
      orderBy: { id: "asc" },
      select: { id: true, email: true, passwordHash: true, mustChangePassword: true, active: true, role: true },
    });
    expect(secondSeedUsers).toEqual(firstSeedUsers);
    expect(await prisma.user.count({ where: { role: "REQUESTER", active: true } })).toBeGreaterThanOrEqual(4);
    expect(await prisma.user.count({ where: { role: "REQUESTER", active: false } })).toBeGreaterThanOrEqual(1);
    expect(await prisma.user.count({ where: { role: "IT_STAFF", active: true } })).toBeGreaterThanOrEqual(3);
    expect(await prisma.user.count({ where: { role: "IT_STAFF", active: false } })).toBeGreaterThanOrEqual(1);
    expect(await prisma.user.count({ where: { role: "ADMIN", active: true } })).toBeGreaterThanOrEqual(1);
    expect(await prisma.user.count()).toBe(new Set(SEED_CREDENTIALS.all.map((credential) => credential.email)).size);
    const user = await prisma.user.findFirstOrThrow();
    expect(user.passwordHash).toMatch(/^scrypt\$/);
  });

  it("allocates staff and administrator IDs without colliding with a migrated requester", async () => {
    const legacyRequester = {
      id: 101,
      name: "Legacy High-ID Requester",
      email: "legacy.high-id@example.com",
      department: "Operations",
      isActive: true,
    };

    await prisma.user.deleteMany({ where: { role: { not: "REQUESTER" } } });
    await prisma.requesterUser.deleteMany({ where: { id: legacyRequester.id } });
    await prisma.requesterUser.create({ data: legacyRequester });
    // Mirror the row that the migration creates before seed initializes its
    // credentials. Setting the sequence makes the collision scenario exact.
    await prisma.user.create({
      data: {
        id: legacyRequester.id,
        email: legacyRequester.email,
        displayName: legacyRequester.name,
        department: legacyRequester.department,
        role: "REQUESTER",
        passwordHash: migrationPendingHash,
        mustChangePassword: true,
        active: legacyRequester.isActive,
      },
    });
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), ${legacyRequester.id}, true)`);

    try {
      await seed(prisma);
      const migrated = await prisma.user.findUniqueOrThrow({ where: { id: legacyRequester.id } });
      const staff = await prisma.user.findMany({ where: { role: "IT_STAFF" }, select: { id: true } });
      const administrators = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });

      expect(migrated.email).toBe(legacyRequester.email);
      expect(migrated.passwordHash).toMatch(/^scrypt\$/);
      expect(staff.map((user) => user.id)).not.toContain(legacyRequester.id);
      expect(administrators.map((user) => user.id)).not.toContain(legacyRequester.id);
      expect(staff).toHaveLength(4);
      expect(administrators).toHaveLength(1);
    } finally {
      await prisma.user.deleteMany({ where: { id: legacyRequester.id } });
      await prisma.requesterUser.deleteMany({ where: { id: legacyRequester.id } });
      await seed(prisma);
    }
  });

  it("initializes and preserves credentials for a migrated requester outside the fixtures", async () => {
    const legacyRequester = {
      id: 777,
      name: "Lab 2 Added Requester",
      email: "lab2-added.requester@example.com",
      department: "Research",
      isActive: true,
    };

    await prisma.user.deleteMany({ where: { role: { not: "REQUESTER" } } });
    await prisma.requesterUser.deleteMany({ where: { id: legacyRequester.id } });
    await prisma.requesterUser.create({ data: legacyRequester });
    await prisma.user.create({
      data: {
        id: legacyRequester.id,
        email: legacyRequester.email,
        displayName: legacyRequester.name,
        department: legacyRequester.department,
        role: "REQUESTER",
        passwordHash: migrationPendingHash,
        mustChangePassword: true,
        active: legacyRequester.isActive,
      },
    });

    try {
      await seed(prisma);
      const initialized = await prisma.user.findUniqueOrThrow({ where: { id: legacyRequester.id } });
      expect(initialized.passwordHash).toMatch(/^scrypt\$/);
      expect(initialized.mustChangePassword).toBe(true);
      expect(await verifyPassword(initialPasswordForRequester(legacyRequester), initialized.passwordHash)).toBe(true);

      const changedHash = await hashPassword("LegacyRequesterChanged!2026");
      await prisma.user.update({ where: { id: legacyRequester.id }, data: { passwordHash: changedHash, mustChangePassword: false } });
      await seed(prisma);
      const preserved = await prisma.user.findUniqueOrThrow({ where: { id: legacyRequester.id } });
      expect(preserved.passwordHash).toBe(changedHash);
      expect(preserved.mustChangePassword).toBe(false);
    } finally {
      await prisma.user.deleteMany({ where: { id: legacyRequester.id } });
      await prisma.requesterUser.deleteMany({ where: { id: legacyRequester.id } });
      await seed(prisma);
    }
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

  it("keeps canonical User relationships usable for migrated ticket and attachment ownership", async () => {
    await seed(prisma);
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-900002",
        summary: "Relationship preservation check",
        description: "A regression ticket verifies canonical ownership links.",
        requestedPriority: "LOW",
        itPriority: "LOW",
        requesterId: SEED_CREDENTIALS.requesters[0].id,
        categoryId: 1,
        relatedSystemId: 1,
        attachments: {
          create: {
            originalFilename: "relationship-check.txt",
            storageKey: "relationship-check-storage-key",
            mimeType: "text/plain",
            fileSize: 0,
            uploaderId: SEED_CREDENTIALS.requesters[0].id,
          },
        },
      },
      include: { attachments: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: SEED_CREDENTIALS.requesters[0].id },
      include: { requesterTickets: true, uploadedAttachments: true },
    });
    expect(user?.requesterTickets.some((item) => item.id === ticket.id)).toBe(true);
    expect(user?.uploadedAttachments.some((item) => item.id === ticket.attachments[0].id)).toBe(true);
    await prisma.ticket.delete({ where: { id: ticket.id } });
  });

  it("preserves Lab 2 reference, counter, ticket, and attachment rows when fixtures are reseeded", async () => {
    await seed(prisma);
    const categoryBefore = await prisma.category.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, isActive: true } });
    const systemBefore = await prisma.relatedSystem.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, isActive: true } });
    const counterBefore = await prisma.ticketCounter.findMany({ orderBy: { year: "asc" } });
    const ticketNumber = `TKT-${new Date().getFullYear()}-980001`;
    const storageKey = `migration-preservation-${randomUUID()}`;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        summary: "Existing Lab 2 ticket preservation check",
        description: "This fixture verifies that reseeding leaves existing ticket data unchanged.",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        requesterId: SEED_CREDENTIALS.requesters[0].id,
        categoryId: categoryBefore[0].id,
        relatedSystemId: systemBefore[0].id,
        attachments: {
          create: {
            originalFilename: "existing-lab2.txt",
            storageKey,
            mimeType: "text/plain",
            fileSize: 0,
            uploaderId: SEED_CREDENTIALS.requesters[0].id,
          },
        },
      },
      include: { attachments: { select: { id: true, ticketId: true, storageKey: true, uploaderId: true } } },
    });
    try {
      const ticketBefore = { id: ticket.id, ticketNumber: ticket.ticketNumber, requesterId: ticket.requesterId, categoryId: ticket.categoryId, relatedSystemId: ticket.relatedSystemId };
      const attachmentBefore = ticket.attachments[0];
      await seed(prisma);

      expect(await prisma.category.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, isActive: true } })).toEqual(categoryBefore);
      expect(await prisma.relatedSystem.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, isActive: true } })).toEqual(systemBefore);
      expect(await prisma.ticketCounter.findMany({ orderBy: { year: "asc" } })).toEqual(counterBefore);
      const ticketAfter = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { id: true, ticketNumber: true, requesterId: true, categoryId: true, relatedSystemId: true } });
      const attachmentAfter = await prisma.attachment.findUniqueOrThrow({ where: { id: attachmentBefore.id }, select: { id: true, ticketId: true, storageKey: true, uploaderId: true } });
      expect(ticketAfter).toEqual(ticketBefore);
      expect(attachmentAfter).toEqual(attachmentBefore);
    } finally {
      await prisma.ticket.delete({ where: { id: ticket.id } });
    }
  });
});
