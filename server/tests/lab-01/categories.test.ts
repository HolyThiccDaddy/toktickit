import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { loginAs, requesterOne } from "../auth-helper.js";
void request; void app;

// Issue 4 — write this test yourself, using health.test.ts as the pattern.
// Requires the DB to be migrated and seeded first.
// It should assert: GET /api/categories returns 200 and the four seeded
// category names in id order.
describe("GET /api/categories", () => {
  it("returns the four seeded categories in id order", async () => {
    const { agent } = await loginAs(requesterOne.email, requesterOne.password);
    const res = await agent.get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { id: 1, name: "Account and Access", description: "Login, credentials, permissions, and account lifecycle" },
      { id: 2, name: "Hardware", description: "Computers, laptops, peripherals, monitors, and physical equipment" },
      { id: 3, name: "Software", description: "Operating systems, licensed productivity software, and system utilities" },
      { id: 4, name: "Network", description: "Campus Wi-Fi, VPN connectivity, IP assignment, and network infrastructure" },
    ]);
  });
});
