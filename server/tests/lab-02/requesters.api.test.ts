import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Development Requester selector removal", () => {
  it("does not expose the legacy requester enumeration endpoint", async () => {
    const response = await request(app).get("/api/requesters");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: "NOT_FOUND", message: "API resource not found" } });
  });
});
