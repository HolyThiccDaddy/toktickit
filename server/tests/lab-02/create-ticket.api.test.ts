import { afterEach, describe, expect, it, vi } from "vitest";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const validTicket = {
  summary: "VPN connection fails",
  description: "The VPN client shows error code 800 when connecting.",
  categoryId: 4,
  relatedSystemId: 3,
  requestedPriority: "HIGH",
};

describe("POST /api/tickets", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await getPrisma().attachment.deleteMany();
    await getPrisma().ticket.deleteMany();
    await getPrisma().ticketCounter.updateMany({ data: { lastSequence: 0 } });
    await rm(resolve(process.cwd(), "uploads"), { recursive: true, force: true });
  });

  it("allocates unique sequential ticket numbers for concurrent requests", async () => {
    const responses = await Promise.all(Array.from({ length: 5 }, (_, index) => request(app).post("/api/tickets").set("x-requester-id", "1").send({ ...validTicket, summary: `VPN connection fails ${index}` })));
    expect(responses.every((response) => response.status === 201)).toBe(true);
    const numbers = responses.map((response) => response.body.ticketNumber);
    expect(new Set(numbers)).toHaveLength(5);
    const year = new Date().getFullYear();
    expect(numbers.sort()).toEqual(Array.from({ length: 5 }, (_, index) => `TKT-${year}-${String(index + 1).padStart(6, "0")}`));
  });

  it("stores a permitted PDF with a randomized key", async () => {
    const response = await request(app).post("/api/tickets").set("x-requester-id", "1")
      .field("summary", validTicket.summary).field("description", validTicket.description)
      .field("categoryId", "4").field("relatedSystemId", "3").field("requestedPriority", "HIGH")
      .attach("files", Buffer.from("%PDF-1.4\nvalid test"), { filename: "evidence.pdf", contentType: "application/pdf" });
    expect(response.status).toBe(201);
    expect(response.body.attachments[0]).toEqual(expect.objectContaining({ originalFilename: "evidence.pdf", mimeType: "application/pdf", isDeleted: false }));
    const attachment = await getPrisma().attachment.findFirstOrThrow();
    expect(attachment.storageKey).not.toContain("evidence");
    await expect(access(resolve(process.cwd(), "uploads", attachment.storageKey))).resolves.toBeUndefined();
  });

  it("rejects more than five files without creating a ticket", async () => {
    let call = request(app).post("/api/tickets").set("x-requester-id", "1")
      .field("summary", validTicket.summary).field("description", validTicket.description)
      .field("categoryId", "4").field("relatedSystemId", "3").field("requestedPriority", "HIGH");
    for (let index = 0; index < 6; index += 1) call = call.attach("files", Buffer.from("%PDF-1.4\ntest"), { filename: `${index}.pdf`, contentType: "application/pdf" });
    const response = await call;
    expect(response.status).toBe(400);
    expect(await getPrisma().ticket.count()).toBe(0);
  });

  it("rejects an attachment larger than 5 MB", async () => {
    const response = await request(app).post("/api/tickets").set("x-requester-id", "1")
      .field("summary", validTicket.summary).field("description", validTicket.description)
      .field("categoryId", "4").field("relatedSystemId", "3").field("requestedPriority", "HIGH")
      .attach("files", Buffer.alloc(5_242_881, 0x25), { filename: "large.pdf", contentType: "application/pdf" });
    expect(response.status).toBe(400);
    expect(await getPrisma().ticket.count()).toBe(0);
  });

  it("rolls back when attachment storage is unavailable", async () => {
    const uploadPath = resolve(process.cwd(), "uploads");
    await mkdir(resolve(process.cwd()), { recursive: true });
    await writeFile(uploadPath, "blocks directory creation");
    const response = await request(app).post("/api/tickets").set("x-requester-id", "1")
      .field("summary", validTicket.summary).field("description", validTicket.description)
      .field("categoryId", "4").field("relatedSystemId", "3").field("requestedPriority", "HIGH")
      .attach("files", Buffer.from("%PDF-1.4\ntest"), { filename: "evidence.pdf", contentType: "application/pdf" });
    expect(response.status).toBe(500);
    expect(await getPrisma().ticket.count()).toBe(0);
  });

  it("creates a NEW ticket with an atomic official ticket number", async () => {
    const response = await request(app).post("/api/tickets").set("x-requester-id", "1").send(validTicket);
    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({
      ticketNumber: expect.stringMatching(/^TKT-\d{4}-\d{6}$/),
      summary: validTicket.summary,
      currentStatus: "NEW",
      requesterId: 1,
      attachments: [],
    }));
  });

  it("rejects missing requester identity and invalid fields without creating a ticket", async () => {
    const response = await request(app).post("/api/tickets").send({ summary: "x" });
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error");
    expect(await getPrisma().ticket.count()).toBe(0);
  });

  it("rejects an inactive requester", async () => {
    const response = await request(app).post("/api/tickets").set("x-requester-id", "5").send(validTicket);
    expect(response.status).toBe(403);
    expect(await getPrisma().ticket.count()).toBe(0);
  });

  it("rejects an invalid attachment before creating a ticket", async () => {
    const response = await request(app).post("/api/tickets").set("x-requester-id", "1")
      .field("summary", validTicket.summary).field("description", validTicket.description)
      .field("categoryId", "4").field("relatedSystemId", "3").field("requestedPriority", "HIGH")
      .attach("files", Buffer.from("not an image"), { filename: "fake.png", contentType: "image/png" });
    expect(response.status).toBe(400);
    expect(await getPrisma().ticket.count()).toBe(0);
  });

  it("returns a safe error when requester lookup fails", async () => {
    vi.spyOn(getPrisma().requesterUser, "findFirst").mockRejectedValueOnce(new Error("database details must not leak"));
    const response = await request(app).post("/api/tickets").set("x-requester-id", "1").send(validTicket);
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to create ticket" });
    expect(JSON.stringify(response.body)).not.toContain("database details");
  });
});
