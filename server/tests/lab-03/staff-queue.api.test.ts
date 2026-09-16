import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";

const prisma = getPrisma();
const staff = { email: "alex.staff@example.com", password: "StaffOne!2026" };
const secondStaff = { email: "casey.staff@example.com", password: "StaffTwo!2026" };
const inactiveStaff = { email: "inactive.staff@example.com", password: "StaffFour!2026" };
const admin = { email: "admin@example.com", password: "AdminOne!2026" };
const requester = { email: "jennifer.anderson@example.com", password: "RequesterOne!2026" };

async function prepareFixtures() {
  await prisma.authSession.deleteMany();
  await prisma.publicComment.deleteMany();
  await prisma.internalNote.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  for (const fixture of [staff, secondStaff, inactiveStaff, admin, requester]) {
    await prisma.user.update({
      where: { email: fixture.email },
      data: { passwordHash: await hashPassword(fixture.password), mustChangePassword: false },
    });
  }
  await prisma.user.update({ where: { email: staff.email }, data: { active: true, role: "IT_STAFF" } });
  await prisma.user.update({ where: { email: secondStaff.email }, data: { active: true, role: "IT_STAFF" } });
  await prisma.user.update({ where: { email: inactiveStaff.email }, data: { active: false, role: "IT_STAFF" } });
  await prisma.user.update({ where: { email: admin.email }, data: { active: true, role: "ADMIN" } });
  await prisma.user.update({ where: { email: requester.email }, data: { active: true, role: "REQUESTER" } });
}

async function login(credentials: { email: string; password: string }) {
  const agent = request.agent(app);
  expect((await agent.post("/api/auth/login").send(credentials)).status).toBe(200);
  const csrf = await agent.get("/api/auth/csrf");
  expect(csrf.status).toBe(200);
  return { agent, csrfToken: csrf.body.data.csrfToken as string };
}

async function createTicket(suffix: string, data: Record<string, unknown> = {}) {
  return prisma.ticket.create({
    data: {
      ticketNumber: `TKT-2026-${suffix}`,
      summary: `Queue ticket ${suffix}`,
      description: "A ticket used to verify staff queue behavior.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      ...data,
    },
  });
}

describe("Issue 38 IT Staff queue and ticket operations", () => {
  beforeEach(prepareFixtures);

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.publicComment.deleteMany();
    await prisma.internalNote.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.$disconnect();
  });

  it("returns a searchable, filterable, sorted, paginated shared queue", async () => {
    await createTicket("380001", { summary: "VPN outage for finance", itPriority: "URGENT", currentStatus: "OPEN" });
    await createTicket("380002", { summary: "Laptop replacement", itPriority: "LOW", currentStatus: "NEW" });
    const { agent } = await login(staff);

    const response = await agent.get("/api/staff/tickets?q=VPN&itPriority=URGENT&sortBy=itPriority&sortDir=desc&page=1&pageSize=1");
    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toEqual(expect.objectContaining({ summary: "VPN outage for finance", itPriority: "URGENT", currentStatus: "OPEN" }));
    expect(response.body.data.items[0].requester).toEqual(expect.objectContaining({ role: "REQUESTER" }));
    expect(response.body.data.meta).toEqual(expect.objectContaining({ page: 1, pageSize: 1, total: 1, totalPages: 1, sortBy: "itPriority", sortDir: "desc" }));
  });

  it("rejects invalid queue queries and non-staff access", async () => {
    const { agent: requesterAgent } = await login(requester);
    expect((await requesterAgent.get("/api/staff/tickets")).status).toBe(403);
    const { agent } = await login(staff);
    const response = await agent.get("/api/staff/tickets?page=0&pageSize=101");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect((await agent.get("/api/staff/tickets?status=OPEN&status=CLOSED")).status).toBe(400);
    expect((await agent.patch("/api/staff/tickets/1/status").set("X-CSRF-Token", (await agent.get("/api/auth/csrf")).body.data.csrfToken).send({ status: "OPEN", confirm: "true" })).status).toBe(400);
    const { agent: adminAgent } = await login(admin);
    expect((await adminAgent.get("/api/staff/tickets")).status).toBe(200);
  });

  it("claims an unassigned ticket atomically and rejects a second claim", async () => {
    const ticket = await createTicket("380003");
    const first = await login(staff);
    const second = await login(secondStaff);
    const [claimed, rejected] = await Promise.all([
      first.agent.post(`/api/staff/tickets/${ticket.id}/claim`).set("X-CSRF-Token", first.csrfToken),
      second.agent.post(`/api/staff/tickets/${ticket.id}/claim`).set("X-CSRF-Token", second.csrfToken),
    ]);
    expect([claimed.status, rejected.status].sort()).toEqual([200, 409]);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).ownerId).toBeTruthy();
  });

  it("only assigns active IT Staff or Administrators and supports unassignment", async () => {
    const ticket = await createTicket("380004");
    const { agent, csrfToken } = await login(staff);
    const inactive = await prisma.user.findUniqueOrThrow({ where: { email: inactiveStaff.email } });
    const rejected = await agent.patch(`/api/staff/tickets/${ticket.id}/assignment`).set("X-CSRF-Token", csrfToken).send({ assigneeId: inactive.id });
    expect(rejected.status).toBe(409);
    expect(rejected.body.error.code).toBe("CONFLICT");
    const assigned = await prisma.user.findUniqueOrThrow({ where: { email: secondStaff.email } });
    const accepted = await agent.patch(`/api/staff/tickets/${ticket.id}/assignment`).set("X-CSRF-Token", csrfToken).send({ assigneeId: assigned.id });
    expect(accepted.status).toBe(200);
    const unassigned = await agent.patch(`/api/staff/tickets/${ticket.id}/assignment`).set("X-CSRF-Token", csrfToken).send({ assigneeId: null });
    expect(unassigned.status).toBe(200);
    expect(unassigned.body.data.owner).toBeNull();
  });

  it("enforces IT Priority and the complete status transition confirmation rules", async () => {
    const ticket = await createTicket("380005", { currentStatus: "IN_PROGRESS" });
    const { agent, csrfToken } = await login(staff);
    expect((await agent.patch(`/api/staff/tickets/${ticket.id}/priority`).set("X-CSRF-Token", csrfToken).send({ itPriority: "URGENT" })).status).toBe(200);
    expect((await agent.patch(`/api/staff/tickets/${ticket.id}/status`).set("X-CSRF-Token", csrfToken).send({ status: "RESOLVED" })).status).toBe(409);
    const changed = await agent.patch(`/api/staff/tickets/${ticket.id}/status`).set("X-CSRF-Token", csrfToken).send({ status: "RESOLVED", confirm: true });
    expect(changed.status).toBe(200);
    expect(changed.body.data.currentStatus).toBe("RESOLVED");
    expect((await agent.patch(`/api/staff/tickets/${ticket.id}/status`).set("X-CSRF-Token", csrfToken).send({ status: "CANCELLED", confirm: true })).status).toBe(409);
  });

  it("keeps public comments visible while protecting internal notes from requesters", async () => {
    const ticket = await createTicket("380006");
    const { agent: staffAgent, csrfToken: staffCsrf } = await login(staff);
    const note = await staffAgent.post(`/api/tickets/${ticket.id}/notes`).set("X-CSRF-Token", staffCsrf).send({ body: "Investigating the network path." });
    expect(note.status).toBe(201);
    const comment = await staffAgent.post(`/api/tickets/${ticket.id}/comments`).set("X-CSRF-Token", staffCsrf).send({ body: "IT is investigating this request." });
    expect(comment.status).toBe(201);
    expect((await staffAgent.get(`/api/staff/tickets/${ticket.id}`)).body.data.internalNotes).toHaveLength(1);
    expect((await staffAgent.get(`/api/tickets/${ticket.id}`)).body.data.internalNotes).toHaveLength(1);
    const { agent: requesterAgent } = await login(requester);
    const requesterDetail = await requesterAgent.get(`/api/tickets/${ticket.id}`);
    expect(requesterDetail.status).toBe(200);
    expect(requesterDetail.body.data.internalNotes).toBeUndefined();
    expect((await requesterAgent.get(`/api/tickets/${ticket.id}/notes`)).status).toBe(403);
  });
});
