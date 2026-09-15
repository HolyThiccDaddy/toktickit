import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { loginAs, requesterOne, requesterTwo } from "../auth-helper.js";

const prisma = getPrisma();
const pdf = Buffer.from("%PDF-1.4\nvalid attachment");
let uploadRoot: string;
let ownerTicketId: number;
let foreignTicketId: number;

async function createFixture() {
  await prisma.authSession.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  const owner = await prisma.ticket.create({ data: { ticketNumber: "TKT-2026-000201", summary: "VPN access fails", description: "The VPN client reports an error when connecting from home.", requestedPriority: "HIGH", requesterId: 1, categoryId: 4, relatedSystemId: 3 } });
  const foreign = await prisma.ticket.create({ data: { ticketNumber: "TKT-2026-000202", summary: "Private payroll issue", description: "This ticket belongs to another requester and is private.", requestedPriority: "MEDIUM", requesterId: 2, categoryId: 3, relatedSystemId: 5 } });
  ownerTicketId = owner.id;
  foreignTicketId = foreign.id;
}

describe("Issue 10 authenticated ticket detail and attachment APIs", () => {
  beforeAll(async () => {
    uploadRoot = await mkdtemp(resolve(tmpdir(), "toktickit-detail-test-"));
    process.env.TOKTICKIT_UPLOAD_ROOT = uploadRoot;
  });

  beforeEach(async () => {
    await rm(uploadRoot, { recursive: true, force: true });
    await mkdir(uploadRoot, { recursive: true });
    await createFixture();
  });

  afterAll(async () => {
    await rm(uploadRoot, { recursive: true, force: true });
    await prisma.authSession.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.$disconnect();
  });

  it("returns owned detail without internal storage keys", async () => {
    const attachment = await prisma.attachment.create({ data: { ticketId: ownerTicketId, originalFilename: "evidence.pdf", storageKey: "owned-key.pdf", mimeType: "application/pdf", fileSize: pdf.length, uploaderId: 1 } });
    await writeFile(resolve(uploadRoot, attachment.storageKey), pdf);
    const { agent } = await loginAs(requesterOne.email, requesterOne.password);
    const response = await agent.get(`/api/tickets/${ownerTicketId}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({ id: ownerTicketId, requester: expect.objectContaining({ id: 1, role: "REQUESTER" }), category: { id: 4, name: "Network", description: expect.any(String) } }));
    expect(response.body.data.attachments[0]).not.toHaveProperty("storageKey");
  });

  it("uses the same safe not-found response for missing and foreign tickets", async () => {
    const { agent } = await loginAs(requesterOne.email, requesterOne.password);
    const foreign = await agent.get(`/api/tickets/${foreignTicketId}`);
    const missing = await agent.get("/api/tickets/999999");
    expect(foreign.status).toBe(404);
    expect(foreign.body).toEqual({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    expect(missing.body).toEqual(foreign.body);
  });

  it("adds and downloads an owned attachment, then soft-removes it", async () => {
    const { agent, csrfToken } = await loginAs(requesterOne.email, requesterOne.password);
    const created = await agent.post(`/api/tickets/${ownerTicketId}/attachments`).set("X-CSRF-Token", csrfToken).attach("file", pdf, { filename: "error.pdf", contentType: "application/pdf" });
    expect(created.status).toBe(201);
    const attachmentId = created.body.data.id as number;
    const saved = await prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
    await mkdir(uploadRoot, { recursive: true });
    await writeFile(resolve(uploadRoot, saved.storageKey), pdf);
    const downloaded = await agent.get(`/api/attachments/${attachmentId}/download`);
    expect(downloaded.status).toBe(200);
    expect(Buffer.from(downloaded.body)).toEqual(pdf);
    const removed = await agent.delete(`/api/attachments/${attachmentId}`).set("X-CSRF-Token", csrfToken).send({ deletionReason: "obsolete evidence" });
    expect(removed.status).toBe(204);
    expect((await prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } })).isDeleted).toBe(true);
  });

  it("rejects forged attachment ownership and invalid content", async () => {
    const { agent, csrfToken } = await loginAs(requesterOne.email, requesterOne.password);
    const foreign = await prisma.attachment.create({ data: { ticketId: foreignTicketId, originalFilename: "private.pdf", storageKey: "private.pdf", mimeType: "application/pdf", fileSize: pdf.length, uploaderId: 2 } });
    const cross = await agent.get(`/api/attachments/${foreign.id}/download`);
    expect(cross.status).toBe(404);
    const bad = await agent.post(`/api/tickets/${ownerTicketId}/attachments`).set("X-CSRF-Token", csrfToken).attach("file", Buffer.from("not pdf"), { filename: "fake.pdf", contentType: "application/pdf" });
    expect(bad.status).toBe(400);
  });
});
