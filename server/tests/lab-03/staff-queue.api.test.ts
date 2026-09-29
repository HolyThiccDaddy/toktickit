import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  admin,
  createTicket,
  inactiveStaff,
  login,
  prepareFixtures,
  prisma,
  requester,
  secondStaff,
  staff,
} from "./staff-ticket-fixtures.js";

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

});
