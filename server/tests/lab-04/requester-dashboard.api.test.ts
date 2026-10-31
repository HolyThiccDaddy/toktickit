import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTicket, login, prepareFixtures, prisma, requester, staff } from "../lab-03/staff-ticket-fixtures.js";

describe("Lab 4 requester dashboard", () => {
  beforeEach(prepareFixtures);
  afterAll(async () => { await prisma.authSession.deleteMany(); await prisma.ticket.deleteMany(); await prisma.$disconnect(); });

  it("returns ownership-scoped metrics and exact drill-down predicates", async () => {
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: requester.email }, select: { id: true } });
    const other = await prisma.user.findUniqueOrThrow({ where: { email: "michael.brown@example.com" }, select: { id: true } });
    const from = new Date("2026-10-01T00:00:00.000Z");
    const to = new Date("2026-10-08T00:00:00.000Z");
    await createTicket("550001", { requesterId: owner.id, currentStatus: "OPEN", updatedAt: new Date("2026-10-02T10:00:00.000Z") });
    await createTicket("550002", { requesterId: owner.id, currentStatus: "WAITING_FOR_REQUESTER", updatedAt: new Date("2026-10-03T10:00:00.000Z") });
    await createTicket("550003", { requesterId: owner.id, currentStatus: "RESOLVED", updatedAt: new Date("2026-10-04T10:00:00.000Z") });
    await createTicket("550004", { requesterId: other.id, currentStatus: "OPEN", updatedAt: new Date("2026-10-04T10:00:00.000Z") });

    const { agent } = await login(requester);
    const response = await agent.get(`/api/dashboard/requester?from=${from.toISOString()}&to=${to.toISOString()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "openTickets", value: 2, href: expect.stringContaining("currentStatuses=NEW,OPEN") }),
      expect.objectContaining({ key: "waitingForRequester", value: 1, href: expect.stringContaining("currentStatus=WAITING_FOR_REQUESTER") }),
      expect.objectContaining({ key: "recentlyResolved", value: 1 }),
    ]));
    expect(response.body.data.items.map((item: { ticketNumber: string }) => item.ticketNumber)).toEqual(expect.arrayContaining(["TKT-2026-550001", "TKT-2026-550002", "TKT-2026-550003"]));
    expect(response.body.data.items.some((item: { ticketNumber: string }) => item.ticketNumber === "TKT-2026-550004")).toBe(false);
    const matchingList = await agent.get("/api/tickets?currentStatuses=OPEN,WAITING_FOR_REQUESTER");
    expect(matchingList.status).toBe(200);
    expect(matchingList.body.data.meta.total).toBe(2);
  });

  it("does not expose the dashboard to another role", async () => {
    const { agent } = await login(staff);
    const response = await agent.get("/api/dashboard/requester");
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });
});
