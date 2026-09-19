import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";

const prisma = getPrisma();
const requesterOne = { email: "jennifer.anderson@example.com", password: "RequesterOne!2026" };
const requesterTwo = { email: "michael.brown@example.com", password: "RequesterTwo!2026" };
const staff = { email: "alex.staff@example.com", password: "StaffOne!2026" };

async function prepareAuthFixtures() {
  await prisma.authSession.deleteMany();
  await prisma.user.updateMany({ data: { mustChangePassword: false } });
  for (const fixture of [requesterOne, requesterTwo, staff]) {
    await prisma.user.update({
      where: { email: fixture.email },
      data: { passwordHash: await hashPassword(fixture.password), active: true },
    });
  }
}

async function login(credentials: { email: string; password: string }) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send(credentials);
  expect(response.status).toBe(200);
  const csrf = await agent.get("/api/auth/csrf");
  expect(csrf.status).toBe(200);
  return { agent, csrfToken: csrf.body.data.csrfToken as string };
}

function createTicket(requesterId: number, suffix: string) {
  return prisma.ticket.create({
    data: {
      ticketNumber: `TKT-2026-${suffix}`,
      summary: `Authorization ${suffix}`,
      description: "A ticket used to verify session-derived ownership.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      requesterId,
      categoryId: 1,
      relatedSystemId: 1,
    },
  });
}

describe("Issue 37 session-derived authorization", () => {
  beforeEach(async () => {
    await prepareAuthFixtures();
    await prisma.publicComment.deleteMany();
    await prisma.internalNote.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.publicComment.deleteMany();
    await prisma.internalNote.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.$disconnect();
  });

  it("rejects the legacy X-Requester-Id header when no session exists", async () => {
    const response = await request(app).get("/api/tickets").set("X-Requester-Id", "1");
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: { code: "UNAUTHENTICATED", message: "Authentication is required" } });
  });

  it("derives ownership from the session and ignores a forged header", async () => {
    const own = await createTicket(1, "371001");
    const foreign = await createTicket(2, "371002");
    const { agent } = await login(requesterOne);

    const response = await agent.get("/api/tickets").set("X-Requester-Id", "2");
    expect(response.status).toBe(200);
    expect(response.body.data.items.map((ticket: { id: number }) => ticket.id)).toEqual([own.id]);
    expect(response.body.data.items.map((ticket: { id: number }) => ticket.id)).not.toContain(foreign.id);
  });

  it("rejects a non-Requester role from requester endpoints", async () => {
    const { agent } = await login(staff);
    const response = await agent.get("/api/tickets");
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: "FORBIDDEN", message: "Only Requesters may access this resource" } });
  });

  it("uses a safe not-found response for a cross-owner detail request", async () => {
    const foreign = await createTicket(2, "371003");
    const { agent } = await login(requesterOne);
    const response = await agent.get(`/api/tickets/${foreign.id}`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  });

  it("ignores requesterId supplied in a ticket body", async () => {
    const { agent, csrfToken } = await login(requesterOne);
    const response = await agent
      .post("/api/tickets")
      .set("X-CSRF-Token", csrfToken)
      .send({
        requesterId: 2,
        summary: "Session owns this ticket",
        description: "The server must use the authenticated requester identity.",
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "LOW",
      });
    expect(response.status).toBe(201);
    expect(response.body.data.requester.id).toBe(1);
  });
});
