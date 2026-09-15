import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";

const prisma = getPrisma();
const requesterOne = { email: "jennifer.anderson@example.com", password: "RequesterOne!2026" };
const requesterTwo = { email: "michael.brown@example.com", password: "RequesterTwo!2026" };

async function prepareFixtures() {
  await prisma.authSession.deleteMany();
  await prisma.publicComment.deleteMany();
  await prisma.internalNote.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  for (const [email, password] of [[requesterOne.email, requesterOne.password], [requesterTwo.email, requesterTwo.password]] as const) {
    await prisma.user.update({ where: { email }, data: { passwordHash: await hashPassword(password), active: true, mustChangePassword: false } });
  }
}

async function login(credentials: { email: string; password: string }) {
  const agent = request.agent(app);
  expect((await agent.post("/api/auth/login").send(credentials)).status).toBe(200);
  const csrf = await agent.get("/api/auth/csrf");
  expect(csrf.status).toBe(200);
  return { agent, csrfToken: csrf.body.data.csrfToken as string };
}

async function createTicket(requesterId: number, suffix: string, currentStatus: "NEW" | "RESOLVED" | "CLOSED" = "NEW") {
  return prisma.ticket.create({
    data: {
      ticketNumber: `TKT-2026-${suffix}`,
      summary: `Requester communication ${suffix}`,
      description: "A ticket used to verify public communication ownership.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus,
      requesterId,
      categoryId: 1,
      relatedSystemId: 1,
    },
  });
}

describe("Issue 37 requester comments and resolution indication", () => {
  beforeEach(prepareFixtures);

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.publicComment.deleteMany();
    await prisma.internalNote.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.$disconnect();
  });

  it("creates and lists an append-only public comment for the owning requester", async () => {
    const ticket = await createTicket(1, "372001");
    const { agent, csrfToken } = await login(requesterOne);

    const before = await agent.get(`/api/tickets/${ticket.id}/comments`);
    expect(before.status).toBe(200);
    expect(before.body).toEqual({ data: [] });

    const created = await agent
      .post(`/api/tickets/${ticket.id}/comments`)
      .set("X-CSRF-Token", csrfToken)
      .send({ body: "The issue is still happening after a restart.", authorId: 2 });
    expect(created.status).toBe(201);
    expect(created.body.data).toEqual(expect.objectContaining({
      ticketId: ticket.id,
      body: "The issue is still happening after a restart.",
      author: expect.objectContaining({ id: 1, role: "REQUESTER" }),
      createdAt: expect.any(String),
    }));

    const listed = await agent.get(`/api/tickets/${ticket.id}/comments`);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0].body).toBe("The issue is still happening after a restart.");
  });

  it("rejects empty and overlong public comments without storing them", async () => {
    const ticket = await createTicket(1, "372006");
    const { agent, csrfToken } = await login(requesterOne);
    const empty = await agent.post(`/api/tickets/${ticket.id}/comments`).set("X-CSRF-Token", csrfToken).send({ body: "   " });
    expect(empty.status).toBe(400);
    expect(empty.body.error).toEqual(expect.objectContaining({ code: "VALIDATION_ERROR", fieldErrors: { body: "Comment must be 1-2000 characters" } }));
    const overlong = await agent.post(`/api/tickets/${ticket.id}/comments`).set("X-CSRF-Token", csrfToken).send({ body: "x".repeat(2_001) });
    expect(overlong.status).toBe(400);
    expect(await prisma.publicComment.count({ where: { ticketId: ticket.id } })).toBe(0);
  });

  it("rejects cross-owner comments and hides internal notes from Requesters", async () => {
    const own = await createTicket(1, "372002");
    const foreign = await createTicket(2, "372003");
    const { agent, csrfToken } = await login(requesterOne);

    const crossOwner = await agent
      .post(`/api/tickets/${foreign.id}/comments`)
      .set("X-CSRF-Token", csrfToken)
      .send({ body: "This must not be stored." });
    expect(crossOwner.status).toBe(404);
    expect(crossOwner.body).toEqual({ error: { code: "NOT_FOUND", message: "Ticket not found" } });

    const notes = await agent.get(`/api/tickets/${own.id}/notes`);
    expect(notes.status).toBe(403);
    expect(notes.body).toEqual({ error: { code: "FORBIDDEN", message: "Only IT Staff or Administrators may access internal notes" } });
  });

  it("records an idempotent resolution indication without changing formal status", async () => {
    const ticket = await createTicket(1, "372004");
    const { agent, csrfToken } = await login(requesterOne);

    const first = await agent.post(`/api/tickets/${ticket.id}/requester-resolution`).set("X-CSRF-Token", csrfToken);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ data: { ticketId: ticket.id, indicatedAt: expect.any(String) } });

    const second = await agent.post(`/api/tickets/${ticket.id}/requester-resolution`).set("X-CSRF-Token", csrfToken);
    expect(second.status).toBe(200);
    expect(second.body.data.indicatedAt).toBe(first.body.data.indicatedAt);

    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.currentStatus).toBe("NEW");
    expect(stored.requesterResolutionIndicatedAt?.toISOString()).toBe(first.body.data.indicatedAt);
  });

  it("does not allow an indication on a terminal Ticket", async () => {
    const ticket = await createTicket(1, "372005", "CLOSED");
    const { agent, csrfToken } = await login(requesterOne);
    const response = await agent.post(`/api/tickets/${ticket.id}/requester-resolution`).set("X-CSRF-Token", csrfToken);
    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: { code: "CONFLICT", message: "A terminal ticket cannot be marked as appearing resolved" } });
  });

  it("allows an indication on a RESOLVED ticket", async () => {
    const ticket = await createTicket(1, "372007", "RESOLVED");
    const { agent, csrfToken } = await login(requesterOne);
    const response = await agent.post(`/api/tickets/${ticket.id}/requester-resolution`).set("X-CSRF-Token", csrfToken);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { ticketId: ticket.id, indicatedAt: expect.any(String) } });
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).currentStatus).toBe("RESOLVED");
  });
});
