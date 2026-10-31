import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTicket, login, prepareFixtures, prisma, requester, staff } from "../lab-03/staff-ticket-fixtures.js";

describe("Lab 4 staff and administrator dashboards", () => {
  beforeEach(prepareFixtures);
  afterAll(async () => { await prisma.authSession.deleteMany(); await prisma.ticket.deleteMany(); await prisma.$disconnect(); });

  it("calculates staff metrics from role-scoped ticket and Action rows", async () => {
    const staffUser = await prisma.user.findUniqueOrThrow({ where: { email: staff.email }, select: { id: true } });
    const unassigned = await createTicket("560001", { ownerId: null, currentStatus: "OPEN" });
    await createTicket("560002", { ownerId: staffUser.id, currentStatus: "IN_PROGRESS" });
    await prisma.actionTaken.create({ data: {
      ticketId: unassigned.id, actionDateTime: new Date("2026-10-20T10:00:00.000Z"), description: "Investigated the service request.", result: "The service is under observation.",
      performedById: staffUser.id, idempotencyKey: "6e0b7f9e-bebd-4d8d-a5f9-000000000001", idempotencyFingerprint: "b".repeat(64),
    } });
    const { agent } = await login(staff);
    const response = await agent.get("/api/dashboard/staff");
    expect(response.status).toBe(200);
    expect(response.body.data.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "unassignedTickets", value: 1, href: expect.stringContaining("assigneeId=unassigned") }),
      expect.objectContaining({ key: "myOwnedTickets", value: 1, href: expect.stringContaining("assigneeId=me") }),
      expect.objectContaining({ key: "myActionsTaken", value: 1, href: expect.stringContaining("/staff/actions?performedBy=me") }),
    ]));
  });

  it("keeps admin dashboard role-scoped and queue filters server-side", async () => {
    const staffUser = await prisma.user.findUniqueOrThrow({ where: { email: staff.email }, select: { id: true } });
    const requesterUser = await prisma.user.findUniqueOrThrow({ where: { email: requester.email }, select: { id: true } });
    await createTicket("560003", { ownerId: staffUser.id, currentStatus: "OPEN" });
    await createTicket("560004", { ownerId: null, currentStatus: "RESOLVED" });
    const { agent } = await login({ email: "admin@example.com", password: "AdminOne!2026" });
    const dashboard = await agent.get("/api/dashboard/admin");
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.accounts).toBeDefined();
    const me = await agent.get("/api/staff/tickets?assigneeId=me&statuses=OPEN,RESOLVED");
    expect(me.status).toBe(200);
    expect(me.body.data.items).toEqual([]);
    const forbidden = await agent.get("/api/dashboard/requester");
    expect(forbidden.status).toBe(403);
    expect(requesterUser.id).toBeGreaterThan(0);
  });
});
