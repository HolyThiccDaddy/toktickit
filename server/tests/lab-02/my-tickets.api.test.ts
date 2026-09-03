import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/tickets", () => {
  beforeEach(async () => {
    await getPrisma().attachment.deleteMany();
    await getPrisma().ticket.deleteMany();
    await getPrisma().ticket.createMany({ data: [
      { ticketNumber: "TKT-2026-000101", summary: "VPN access fails", description: "VPN access fails from home network.", requestedPriority: "HIGH", requesterId: 1, categoryId: 4, relatedSystemId: 3, createdAt: new Date("2026-08-22T08:00:00.000Z") },
      { ticketNumber: "TKT-2026-000102", summary: "Laptop screen flickers", description: "The laptop screen flickers after login.", requestedPriority: "MEDIUM", requesterId: 1, categoryId: 2, relatedSystemId: 7, createdAt: new Date("2026-08-23T08:00:00.000Z") },
      { ticketNumber: "TKT-2026-000103", summary: "Private payroll issue", description: "This ticket belongs to another requester.", requestedPriority: "URGENT", requesterId: 2, categoryId: 3, relatedSystemId: 5, createdAt: new Date("2026-08-24T08:00:00.000Z") },
    ] });
  });

  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await getPrisma().attachment.deleteMany();
    await getPrisma().ticket.deleteMany();
  });

  it("returns only tickets owned by the active requester", async () => {
    const response = await request(app).get("/api/tickets").set("x-requester-id", "1");
    expect(response.status).toBe(200);
    expect(response.body.tickets.map((ticket: { ticketNumber: string }) => ticket.ticketNumber)).toEqual([
      "TKT-2026-000102", "TKT-2026-000101",
    ]);
    expect(response.body.pagination).toEqual({ total: 2, page: 1, limit: 10, totalPages: 1 });
  });

  it("searches case-insensitively by summary or ticket number", async () => {
    const bySummary = await request(app).get("/api/tickets?search=vPn AcCeSs").set("x-requester-id", "1");
    const byNumber = await request(app).get("/api/tickets?search=000102").set("x-requester-id", "1");
    expect(bySummary.body.tickets).toHaveLength(1);
    expect(bySummary.body.tickets[0].ticketNumber).toBe("TKT-2026-000101");
    expect(byNumber.body.tickets[0].ticketNumber).toBe("TKT-2026-000102");
  });

  it("combines category, priority, and status filters", async () => {
    const response = await request(app)
      .get("/api/tickets?categoryId=4&requestedPriority=HIGH&currentStatus=NEW")
      .set("x-requester-id", "1");
    expect(response.status).toBe(200);
    expect(response.body.tickets).toHaveLength(1);
    expect(response.body.tickets[0]).toEqual(expect.objectContaining({
      ticketNumber: "TKT-2026-000101",
      category: { id: 4, name: "Network" },
      relatedSystem: { id: 3, name: "VPN" },
    }));
  });

  it("sorts and paginates with accurate metadata", async () => {
    const response = await request(app)
      .get("/api/tickets?sortBy=summary&sortOrder=asc&page=2&limit=1")
      .set("x-requester-id", "1");
    expect(response.status).toBe(200);
    expect(response.body.tickets).toHaveLength(1);
    expect(response.body.tickets[0].summary).toBe("VPN access fails");
    expect(response.body.pagination).toEqual({ total: 2, page: 2, limit: 1, totalPages: 2 });
  });

  it.each(["createdAt", "ticketNumber", "summary", "requestedPriority"])("supports deterministic %s sorting", async (sortBy) => {
    const response = await request(app)
      .get(`/api/tickets?sortBy=${sortBy}&sortOrder=asc`)
      .set("x-requester-id", "1");
    expect(response.status).toBe(200);
    expect(response.body.tickets).toHaveLength(2);
  });

  it("uses ticket id as a deterministic secondary sort", async () => {
    await getPrisma().ticket.updateMany({ where: { requesterId: 1 }, data: { summary: "Same summary" } });
    const response = await request(app)
      .get("/api/tickets?sortBy=summary&sortOrder=asc")
      .set("x-requester-id", "1");
    const ids = response.body.tickets.map((ticket: { id: number }) => ticket.id);
    expect(ids).toEqual([...ids].sort((left, right) => left - right));
  });

  it("rejects missing identity and unsupported query values safely", async () => {
    expect((await request(app).get("/api/tickets")).status).toBe(401);
    expect((await request(app).get("/api/tickets?sortBy=requesterId").set("x-requester-id", "1")).status).toBe(400);
    expect((await request(app).get("/api/tickets?page=0&limit=51").set("x-requester-id", "1")).status).toBe(400);
  });

  it.each([
    "categoryId=0", "categoryId=abc", "requestedPriority=CRITICAL", "currentStatus=CLOSED",
    "sortOrder=sideways", "page=0", "page=1.5", "limit=0", "limit=51",
  ])("rejects invalid query value %s", async (query) => {
    const response = await request(app).get(`/api/tickets?${query}`).set("x-requester-id", "1");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid ticket query parameters" });
  });

  it("rejects an inactive requester and hides backend failures", async () => {
    expect((await request(app).get("/api/tickets").set("x-requester-id", "5")).status).toBe(403);
    vi.spyOn(getPrisma().requesterUser, "findFirst").mockRejectedValueOnce(new Error("secret database detail"));
    const response = await request(app).get("/api/tickets").set("x-requester-id", "1");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch tickets" });
  });
});
