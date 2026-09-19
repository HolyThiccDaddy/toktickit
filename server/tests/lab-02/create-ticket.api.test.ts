import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAs, requesterOne } from "../auth-helper.js";

const prisma = getPrisma();
const validTicket = {
  summary: "VPN connection fails",
  description: "The VPN client cannot connect from the home network.",
  categoryId: 4,
  relatedSystemId: 3,
  requestedPriority: "HIGH",
};
const pdf = Buffer.from("%PDF-1.4\nvalid attachment");

describe("POST /api/tickets — authenticated requester regression", () => {
  beforeEach(async () => {
    await prisma.authSession.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.ticketCounter.deleteMany();
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.$disconnect();
  });

  it("creates a NEW ticket owned by the session and ignores body identity", async () => {
    const { agent, csrfToken } = await loginAs(requesterOne.email, requesterOne.password);
    const response = await agent.post("/api/tickets").set("X-CSRF-Token", csrfToken).send({ ...validTicket, requesterId: 999, ownerId: 999 });
    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(expect.objectContaining({
      ticketNumber: expect.stringMatching(/^TKT-\d{4}-\d{6}$/),
      currentStatus: "NEW",
      requester: expect.objectContaining({ id: 1, role: "REQUESTER" }),
      owner: null,
      itPriority: "HIGH",
    }));
  });

  it("allocates unique ticket numbers under concurrent authenticated requests", async () => {
    const { agent, csrfToken } = await loginAs(requesterOne.email, requesterOne.password);
    const responses = await Promise.all(Array.from({ length: 5 }, (_, index) => agent.post("/api/tickets").set("X-CSRF-Token", csrfToken).send({ ...validTicket, summary: `VPN connection fails ${index}` })));
    expect(responses.every((response) => response.status === 201)).toBe(true);
    const numbers = responses.map((response) => response.body.data.ticketNumber);
    expect(new Set(numbers).size).toBe(5);
  });

  it("stores a permitted PDF without exposing its storage key", async () => {
    const { agent, csrfToken } = await loginAs(requesterOne.email, requesterOne.password);
    const response = await agent.post("/api/tickets").set("X-CSRF-Token", csrfToken)
      .field("summary", validTicket.summary).field("description", validTicket.description)
      .field("categoryId", String(validTicket.categoryId)).field("relatedSystemId", String(validTicket.relatedSystemId)).field("requestedPriority", validTicket.requestedPriority)
      .attach("files", pdf, { filename: "evidence.pdf", contentType: "application/pdf" });
    expect(response.status).toBe(201);
    expect(response.body.data.attachments[0]).toEqual(expect.objectContaining({ originalFilename: "evidence.pdf", mimeType: "application/pdf", isDeleted: false }));
    expect(response.body.data.attachments[0]).not.toHaveProperty("storageKey");
  });

  it("rejects invalid fields, attachments, and missing CSRF without creating a ticket", async () => {
    const { agent, csrfToken } = await loginAs(requesterOne.email, requesterOne.password);
    const missingCsrf = await agent.post("/api/tickets").send(validTicket);
    expect(missingCsrf.status).toBe(403);
    expect(missingCsrf.body.error.code).toBe("CSRF_INVALID");
    const invalid = await agent.post("/api/tickets").set("X-CSRF-Token", csrfToken).send({ ...validTicket, summary: "x", description: "short" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toEqual(expect.objectContaining({ code: "VALIDATION_ERROR", fieldErrors: expect.objectContaining({ summary: expect.any(String), description: expect.any(String) }) }));
    const badFile = await agent.post("/api/tickets").set("X-CSRF-Token", csrfToken)
      .field("summary", validTicket.summary).field("description", validTicket.description).field("categoryId", "4").field("relatedSystemId", "3").field("requestedPriority", "HIGH")
      .attach("files", Buffer.from("not an image"), { filename: "fake.png", contentType: "image/png" });
    expect(badFile.status).toBe(400);
    expect(await prisma.ticket.count()).toBe(0);
  });
});
