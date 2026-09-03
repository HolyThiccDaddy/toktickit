import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { access, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import express from "express";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTicketsRouter } from "../../src/tickets.js";

const pdf = Buffer.from("%PDF-1.4\nvalid attachment");
let uploadRoot: string;
let ownerTicketId: number;
let otherTicketId: number;

async function createFixture() {
  const prisma = getPrisma();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  const owner = await prisma.ticket.create({ data: { ticketNumber: "TKT-2026-000201", summary: "VPN access fails", description: "The VPN client reports an error when connecting from home.", requestedPriority: "HIGH", requesterId: 1, categoryId: 4, relatedSystemId: 3 } });
  const other = await prisma.ticket.create({ data: { ticketNumber: "TKT-2026-000202", summary: "Private payroll issue", description: "This ticket belongs to another requester and is private.", requestedPriority: "MEDIUM", requesterId: 2, categoryId: 3, relatedSystemId: 5 } });
  ownerTicketId = owner.id; otherTicketId = other.id;
}

describe("Issue 10 ticket detail and attachment APIs", () => {
  const previousUploadRoot = process.env.TOKTICKIT_UPLOAD_ROOT;
  beforeAll(async () => { uploadRoot = await mkdtemp(resolve(tmpdir(), "toktickit-detail-test-")); process.env.TOKTICKIT_UPLOAD_ROOT = uploadRoot; });
  beforeEach(async () => { await createFixture(); await rm(uploadRoot, { recursive: true, force: true }); await mkdir(uploadRoot, { recursive: true }); });
  afterEach(async () => { await getPrisma().attachment.deleteMany(); await getPrisma().ticket.deleteMany(); });
  afterAll(async () => { await rm(uploadRoot, { recursive: true, force: true }); if (previousUploadRoot === undefined) delete process.env.TOKTICKIT_UPLOAD_ROOT; else process.env.TOKTICKIT_UPLOAD_ROOT = previousUploadRoot; });

  it("returns the complete owned ticket detail without internal storage keys", async () => {
    const attachment = await getPrisma().attachment.create({ data: { ticketId: ownerTicketId, originalFilename: "evidence.pdf", storageKey: "owned-key.pdf", mimeType: "application/pdf", fileSize: pdf.length, uploaderId: 1 } });
    await writeFile(resolve(uploadRoot, attachment.storageKey), pdf);
    const response = await request(app).get(`/api/tickets/${ownerTicketId}`).set("x-requester-id", "1");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ id: ownerTicketId, ticketNumber: "TKT-2026-000201", summary: "VPN access fails", description: expect.any(String), requestedPriority: "HIGH", currentStatus: "NEW", requester: { id: 1, name: expect.any(String), email: expect.any(String) }, category: { id: 4, name: "Network" }, relatedSystem: { id: 3, name: "VPN" } }));
    expect(response.body.attachments).toEqual([expect.objectContaining({ id: attachment.id, originalFilename: "evidence.pdf", fileSize: pdf.length, mimeType: "application/pdf", isDeleted: false })]);
    expect(response.body.attachments[0]).not.toHaveProperty("storageKey");
  });

  it("protects ticket detail from cross-requester access and missing identities", async () => {
    expect((await request(app).get(`/api/tickets/${ownerTicketId}`)).status).toBe(401);
    expect((await request(app).get(`/api/tickets/${ownerTicketId}`).set("x-requester-id", "2")).status).toBe(403);
    expect((await request(app).get("/api/tickets/999999").set("x-requester-id", "1")).status).toBe(404);
  });

  it("adds a validated attachment and leaves the storage key private", async () => {
    const response = await request(app).post(`/api/tickets/${ownerTicketId}/attachments`).set("x-requester-id", "1").attach("file", pdf, { filename: "error.pdf", contentType: "application/pdf" });
    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({ originalFilename: "error.pdf", mimeType: "application/pdf", fileSize: pdf.length, isDeleted: false }));
    expect(response.body).not.toHaveProperty("storageKey");
    const saved = await getPrisma().attachment.findFirstOrThrow();
    await expect(access(resolve(uploadRoot, saved.storageKey))).resolves.toBeUndefined();
  });

  it("rejects invalid attachment content and unauthorized or missing tickets", async () => {
    expect((await request(app).post(`/api/tickets/${ownerTicketId}/attachments`).set("x-requester-id", "1").attach("file", Buffer.from("not pdf"), { filename: "fake.pdf", contentType: "application/pdf" })).status).toBe(400);
    expect((await request(app).post(`/api/tickets/${ownerTicketId}/attachments`).set("x-requester-id", "2").attach("file", pdf, { filename: "other.pdf", contentType: "application/pdf" })).status).toBe(403);
    expect((await request(app).post("/api/tickets/999999/attachments").set("x-requester-id", "1").attach("file", pdf, { filename: "missing.pdf", contentType: "application/pdf" })).status).toBe(404);
    expect(await getPrisma().attachment.count()).toBe(0);
  });

  it("enforces the five active attachment limit while allowing a deleted slot", async () => {
    await getPrisma().attachment.createMany({ data: Array.from({ length: 5 }, (_, index) => ({ ticketId: ownerTicketId, originalFilename: `${index}.pdf`, storageKey: `existing-${index}.pdf`, mimeType: "application/pdf", fileSize: pdf.length, uploaderId: 1 })) });
    expect((await request(app).post(`/api/tickets/${ownerTicketId}/attachments`).set("x-requester-id", "1").attach("file", pdf, { filename: "sixth.pdf", contentType: "application/pdf" })).status).toBe(400);
    await getPrisma().attachment.update({ where: { storageKey: "existing-0.pdf" }, data: { isDeleted: true, deletionReason: "obsolete", deletedAt: new Date() } });
    expect((await request(app).post(`/api/tickets/${ownerTicketId}/attachments`).set("x-requester-id", "1").attach("file", pdf, { filename: "replacement.pdf", contentType: "application/pdf" })).status).toBe(201);
  });

  it("keeps the active attachment limit under concurrent uploads", async () => {
    const responses = await Promise.all(Array.from({ length: 6 }, (_, index) => request(app).post(`/api/tickets/${ownerTicketId}/attachments`).set("x-requester-id", "1").attach("file", pdf, { filename: `parallel-${index}.pdf`, contentType: "application/pdf" })));
    expect(responses.filter((response) => response.status === 201)).toHaveLength(5);
    expect(responses.filter((response) => response.status === 400)).toHaveLength(1);
    expect(await getPrisma().attachment.count({ where: { ticketId: ownerTicketId, isDeleted: false } })).toBe(5);
  });

  it("compensates staged and final files when attachment persistence fails", async () => {
    const isolatedRoot = resolve(uploadRoot, "move-failure");
    const failureApp = express();
    failureApp.use(express.json());
    failureApp.use("/api/tickets", createTicketsRouter({ getUploadRoot: () => isolatedRoot, moveAttachment: async () => { throw new Error("simulated storage failure"); } }));
    const response = await request(failureApp).post(`/api/tickets/${ownerTicketId}/attachments`).set("x-requester-id", "1").attach("file", pdf, { filename: "failure.pdf", contentType: "application/pdf" });
    expect(response.status).toBe(500);
    expect(await getPrisma().attachment.count()).toBe(0);
    expect(await readdir(isolatedRoot).catch(() => [])).toEqual([]);
  });

  it("downloads an active attachment for its owner only", async () => {
    const attachment = await getPrisma().attachment.create({ data: { ticketId: ownerTicketId, originalFilename: "download me.pdf", storageKey: "download-key.pdf", mimeType: "application/pdf", fileSize: pdf.length, uploaderId: 1 } });
    await writeFile(resolve(uploadRoot, attachment.storageKey), pdf);
    const response = await request(app).get(`/api/attachments/${attachment.id}/download`).set("x-requester-id", "1");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["content-disposition"]).toContain("download me.pdf");
    expect(Buffer.from(response.body)).toEqual(pdf);
    expect((await request(app).get(`/api/attachments/${attachment.id}/download`).set("x-requester-id", "2")).status).toBe(403);
  });

  it("rejects downloads of soft-removed or missing attachments", async () => {
    const attachment = await getPrisma().attachment.create({ data: { ticketId: ownerTicketId, originalFilename: "removed.pdf", storageKey: "removed-key.pdf", mimeType: "application/pdf", fileSize: pdf.length, uploaderId: 1, isDeleted: true, deletionReason: "No longer needed", deletedAt: new Date() } });
    await writeFile(resolve(uploadRoot, attachment.storageKey), pdf);
    expect((await request(app).get(`/api/attachments/${attachment.id}/download`).set("x-requester-id", "1")).status).toBe(410);
    expect((await request(app).get("/api/attachments/999999/download").set("x-requester-id", "1")).status).toBe(404);
  });

  it("soft-removes an attachment with a required reason and preserves metadata", async () => {
    const attachment = await getPrisma().attachment.create({ data: { ticketId: ownerTicketId, originalFilename: "remove.pdf", storageKey: "remove-key.pdf", mimeType: "application/pdf", fileSize: pdf.length, uploaderId: 1 } });
    const response = await request(app).delete(`/api/attachments/${attachment.id}`).set("x-requester-id", "1").send({ deletionReason: "  obsolete evidence  " });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Attachment removed successfully", attachment: expect.objectContaining({ id: attachment.id, isDeleted: true, deletionReason: "obsolete evidence", deletedAt: expect.any(String) }) });
    const stored = await getPrisma().attachment.findUniqueOrThrow({ where: { id: attachment.id } });
    expect(stored.storageKey).toBe("remove-key.pdf");
    expect((await request(app).delete(`/api/attachments/${attachment.id}`).set("x-requester-id", "1").send({ deletionReason: "again" })).status).toBe(404);
  });

  it("rejects invalid removal reasons and cross-owner removal", async () => {
    const attachment = await getPrisma().attachment.create({ data: { ticketId: ownerTicketId, originalFilename: "remove.pdf", storageKey: "remove-reason-key.pdf", mimeType: "application/pdf", fileSize: pdf.length, uploaderId: 1 } });
    expect((await request(app).delete(`/api/attachments/${attachment.id}`).set("x-requester-id", "1").send({ deletionReason: "x" })).status).toBe(400);
    expect((await request(app).delete(`/api/attachments/${attachment.id}`).set("x-requester-id", "2").send({ deletionReason: "valid reason" })).status).toBe(403);
  });
});
