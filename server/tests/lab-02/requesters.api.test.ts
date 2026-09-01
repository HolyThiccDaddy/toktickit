import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/requesters", () => {
  it("returns only active development requesters", async () => {
    const response = await request(app).get("/api/requesters");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(4);
    expect(response.body.every((requester: { isActive: boolean }) => requester.isActive)).toBe(true);
    expect(response.body.map((requester: { email: string }) => requester.email)).not.toContain(
      "robert.taylor@example.com",
    );
  });
});
