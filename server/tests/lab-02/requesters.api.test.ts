import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/requesters", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns only active development requesters", async () => {
    const response = await request(app).get("/api/requesters");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(4);
    expect(response.body.every((requester: { isActive: boolean }) => requester.isActive)).toBe(true);
    expect(response.body.map((requester: { email: string }) => requester.email)).not.toContain(
      "robert.taylor@example.com",
    );
    expect(response.body[0]).toEqual(expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      email: expect.any(String),
      department: expect.any(String),
      isActive: true,
    }));
  });

  it("returns the documented safe error when the database fails", async () => {
    vi.spyOn(getPrisma().requesterUser, "findMany").mockRejectedValueOnce(new Error("database unavailable"));
    const response = await request(app).get("/api/requesters");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch requesters" });
  });
});
