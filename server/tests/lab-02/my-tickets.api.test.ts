import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs, requesterOne, requesterTwo } from "../auth-helper.js";

const prisma = getPrisma();

describe("GET /api/tickets — authenticated requester regression", () => {
  beforeEach(async () => {
    await prisma.authSession.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.ticket.createMany({ data: [
      { ticketNumber: "TKT-2026-000101", summary: "VPN access fails", description: "VPN access fails from home network.", requestedPriority: "HIGH", requesterId: 1, categoryId: 4, relatedSystemId: 3, createdAt: new Date("2026-08-22T08:00:00.000Z") },
      { ticketNumber: "TKT-2026-000102", summary: "Laptop screen flickers", description: "The laptop screen flickers after login.", requestedPriority: "MEDIUM", requesterId: 1, categoryId: 2, relatedSystemId: 7, createdAt: new Date("2026-08-23T08:00:00.000Z") },
      { ticketNumber: "TKT-2026-000103", summary: "Private payroll issue", description: "This ticket belongs to another requester.", requestedPriority: "URGENT", requesterId: 2, categoryId: 3, relatedSystemId: 5, createdAt: new Date("2026-08-24T08:00:00.000Z") },
    ] });
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.$disconnect();
  });

  it("returns only tickets owned by the authenticated requester", async () => {
    const { agent } = await loginAs(requesterOne.email, requesterOne.password);
    const response = await agent.get("/api/tickets");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ data: expect.objectContaining({ items: expect.any(Array), meta: expect.any(Object) }) }));
    expect(response.body.data.items.map((ticket: { ticketNumber: string }) => ticket.ticketNumber)).toEqual(["TKT-2026-000102", "TKT-2026-000101"]);
    expect(response.body.data.meta).toEqual(expect.objectContaining({ total: 2, page: 1, pageSize: 10, totalPages: 1 }));
  });

  it("supports search, filters, sorting, and pagination", async () => {
    const { agent } = await loginAs(requesterOne.email, requesterOne.password);
    const bySummary = await agent.get("/api/tickets?search=vPn%20AcCeSs");
    expect(bySummary.body.data.items[0].ticketNumber).toBe("TKT-2026-000101");
    const filtered = await agent.get("/api/tickets?categoryId=4&requestedPriority=HIGH&currentStatus=NEW");
    expect(filtered.body.data.items).toHaveLength(1);
    const page = await agent.get("/api/tickets?sortBy=summary&sortOrder=asc&page=2&limit=1");
    expect(page.body.data.items[0].summary).toBe("VPN access fails");
    expect(page.body.data.meta).toEqual(expect.objectContaining({ page: 2, pageSize: 1, total: 2, totalPages: 2 }));
  });

  it("rejects missing sessions and invalid query values safely", async () => {
    expect((await request(app).get("/api/tickets")).body).toEqual({ error: { code: "UNAUTHENTICATED", message: "Authentication is required" } });
    const { agent } = await loginAs(requesterOne.email, requesterOne.password);
    const invalid = await agent.get("/api/tickets?sortBy=requesterId");
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("ignores a forged requester header and cannot expose another requester", async () => {
    const { agent } = await loginAs(requesterOne.email, requesterOne.password);
    const response = await agent.get("/api/tickets").set("X-Requester-Id", "2");
    expect(response.body.data.items.every((ticket: { requester: { id: number } }) => ticket.requester.id === 1)).toBe(true);
    expect(response.body.data.items.map((ticket: { requester: { id: number } }) => ticket.requester.id)).not.toContain(2);
  });

  it("does not permit a second requester session to read the first requester's tickets", async () => {
    const { agent } = await loginAs(requesterTwo.email, requesterTwo.password);
    const response = await agent.get("/api/tickets");
    expect(response.body.data.items.every((ticket: { requester: { id: number } }) => ticket.requester.id === 2)).toBe(true);
  });
});
