import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { access, mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import express from "express";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTicketsRouter } from "../../src/tickets.js";

const validTicket = {
  summary: "VPN connection fails",
  description: "The VPN client shows error code 800 when connecting.",
  categoryId: 4,
  relatedSystemId: 3,
  requestedPriority: "HIGH",
};

describe("POST /api/tickets", () => {
  let testUploadRoot: string;
  const previousUploadRoot = process.env.TOKTICKIT_UPLOAD_ROOT;

  beforeAll(async () => {
    testUploadRoot = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(resolve(tmpdir(), "toktickit-ticket-test-")));
    process.env.TOKTICKIT_UPLOAD_ROOT = testUploadRoot;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await getPrisma().attachment.deleteMany();
    await getPrisma().ticket.deleteMany();
    await getPrisma().ticketCounter.updateMany({ data: { lastSequence: 0 } });
    await rm(testUploadRoot, { recursive: true, force: true });
    await mkdir(testUploadRoot, { recursive: true });
  });

  afterAll(async () => {
    await rm(testUploadRoot, { recursive: true, force: true });
    if (previousUploadRoot === undefined) delete process.env.TOKTICKIT_UPLOAD_ROOT;
    else process.env.TOKTICKIT_UPLOAD_ROOT = previousUploadRoot;
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
    await expect(access(resolve(testUploadRoot, attachment.storageKey))).resolves.toBeUndefined();
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
    const uploadPath = resolve(testUploadRoot, "blocked");
    await writeFile(uploadPath, "blocks directory creation");
    const storageFailureApp = express();
    storageFailureApp.use(express.json());
    storageFailureApp.use("/api/tickets", createTicketsRouter({ getUploadRoot: () => uploadPath }));
    const response = await request(storageFailureApp).post("/api/tickets").set("x-requester-id", "1")
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

  it("returns exact field errors for invalid summary and description", async () => {
    const response = await request(app).post("/api/tickets").set("x-requester-id", "1").send({
      ...validTicket,
      summary: "x",
      description: "short",
    });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Validation failed",
      fieldErrors: {
        summary: "Summary must be 5-150 characters",
        description: "Description must be 10-2000 characters",
      },
    });
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

  it("cleans staged and final files when moving the second file fails", async () => {
    const isolatedRoot = resolve(testUploadRoot, "partial-move");
    let moveCount = 0;
    const partialFailureApp = express();
    partialFailureApp.use(express.json());
    partialFailureApp.use("/api/tickets", createTicketsRouter({
      getUploadRoot: () => isolatedRoot,
      moveAttachment: async (source, destination) => {
        moveCount += 1;
        if (moveCount === 2) throw new Error("simulated second move failure");
        await rename(source, destination);
      },
    }));

    const response = await request(partialFailureApp).post("/api/tickets").set("x-requester-id", "1")
      .field("summary", validTicket.summary).field("description", validTicket.description)
      .field("categoryId", "4").field("relatedSystemId", "3").field("requestedPriority", "HIGH")
      .attach("files", Buffer.from("%PDF-1.4\nfirst"), { filename: "first.pdf", contentType: "application/pdf" })
      .attach("files", Buffer.from("%PDF-1.4\nsecond"), { filename: "second.pdf", contentType: "application/pdf" });

    expect(response.status).toBe(500);
    expect(await getPrisma().ticket.count()).toBe(0);
    const remainingFiles = await readdir(isolatedRoot).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    expect(remainingFiles).toEqual([]);
  });
});
