import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTicket,
  admin,
  login,
  prepareFixtures,
  prisma,
  requester,
  staff,
} from "../lab-03/staff-ticket-fixtures.js";

const actionPayload = {
  actionDateTime: "2026-10-29T10:30:00.000Z",
  description: "Replaced the failed network adapter",
  result: "The ticket is responding normally",
  followUpRequired: false,
};

describe("Issue #52 Actions Taken read API", () => {
  beforeEach(prepareFixtures);

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.publicComment.deleteMany();
    await prisma.internalNote.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.$disconnect();
  });

  it("returns only active IT Staff and Administrator users for the Action assignee selector", async () => {
    const { agent } = await login(staff);

    const response = await agent.get("/api/staff/assignees");

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((candidate: { active: boolean; role: string }) => candidate.active && ["IT_STAFF", "ADMIN"].includes(candidate.role))).toBe(true);
    expect(response.body.data.some((candidate: { email: string }) => candidate.email === requester.email)).toBe(false);
    expect(response.body.data.some((candidate: { email: string }) => candidate.email === admin.email)).toBe(true);
  });

  it("returns an empty action collection for an owned legacy ticket", async () => {
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: requester.email }, select: { id: true } });
    const ticket = await createTicket("520001", { requesterId: owner.id });
    const { agent } = await login(requester);

    const response = await agent.get(`/api/tickets/${ticket.id}/actions`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.meta.total).toBe(0);
  });

  it("keeps Action creation staff-only", async () => {
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: requester.email }, select: { id: true } });
    const ticket = await createTicket("520002", { requesterId: owner.id });
    const { agent, csrfToken } = await login(requester);

    const response = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0001")
      .send(actionPayload);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("creates an Action from the authenticated Staff identity and replays an identical idempotent submission", async () => {
    const ticket = await createTicket("520003");
    const staffUser = await prisma.user.findUniqueOrThrow({ where: { email: staff.email }, select: { id: true } });
    const { agent, csrfToken } = await login(staff);
    const key = "b77c8f42-8e10-4fb5-9b03-e3f3d1df0002";
    const submit = () => agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", key)
      .send({ ...actionPayload, performedById: 999999 });

    const first = await submit();
    const retry = await submit();

    expect(first.status).toBe(201);
    expect(first.body.data.performedBy.id).toBe(staffUser.id);
    expect(first.body.data.performedById).toBeUndefined();
    expect(retry.status).toBe(201);
    expect(retry.headers["idempotency-replayed"]).toBe("true");
    expect(retry.body.data.id).toBe(first.body.data.id);
    expect(first.body.data).not.toHaveProperty("idempotencyResponse");
  });

  it("replays an idempotent Action after its assignee is deactivated", async () => {
    const ticket = await createTicket("520030");
    const assignee = await prisma.user.findUniqueOrThrow({ where: { email: "casey.staff@example.com" }, select: { id: true } });
    const { agent, csrfToken } = await login(staff);
    const key = "b77c8f42-8e10-4fb5-9b03-e3f3d1df0031";
    const payload = { ...actionPayload, assigneeId: assignee.id };

    const first = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", key)
      .send(payload);
    expect(first.status).toBe(201);

    await prisma.user.update({ where: { id: assignee.id }, data: { active: false } });
    try {
      const retry = await agent.post(`/api/tickets/${ticket.id}/actions`)
        .set("X-CSRF-Token", csrfToken)
        .set("Idempotency-Key", key)
        .send(payload);

      expect(retry.status).toBe(201);
      expect(retry.headers["idempotency-replayed"]).toBe("true");
      expect(retry.body).toEqual(first.body);
    } finally {
      await prisma.user.update({ where: { id: assignee.id }, data: { active: true } });
    }
  });

  it("rejects key reuse with a changed normalized payload and creates no duplicate", async () => {
    const ticket = await createTicket("520010");
    const { agent, csrfToken } = await login(staff);
    const key = "b77c8f42-8e10-4fb5-9b03-e3f3d1df0010";
    const first = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", key)
      .send(actionPayload);
    const changed = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", key)
      .send({ ...actionPayload, result: "Different result" });

    expect(first.status).toBe(201);
    expect(changed.status).toBe(409);
    expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(1);
  });

  it("replays the original creation response after an Action has been edited", async () => {
    const ticket = await createTicket("520025");
    const { agent, csrfToken } = await login(staff);
    const key = "b77c8f42-8e10-4fb5-9b03-e3f3d1df0029";
    const first = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", key)
      .send(actionPayload);
    await agent.patch(`/api/tickets/${ticket.id}/actions/${first.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, state: "IN_PROGRESS", result: "Updated after the first submission" });
    const retry = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", key)
      .send(actionPayload);

    expect(first.status).toBe(201);
    expect(retry.status).toBe(201);
    expect(retry.headers["idempotency-replayed"]).toBe("true");
    expect(retry.body).toEqual(first.body);
  });

  it("rejects a missing idempotency key before writing an Action", async () => {
    const ticket = await createTicket("520011");
    const { agent, csrfToken } = await login(staff);
    const response = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .send(actionPayload);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
  });

  it("rejects an invalid idempotency key and returns only a safe validation envelope", async () => {
    const ticket = await createTicket("520004");
    const { agent, csrfToken } = await login(staff);

    const response = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "not-a-uuid")
      .send(actionPayload);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(response.body)).not.toMatch(/sql|stack|filesystem|storageKey/i);
  });

  it("requires the existing session CSRF token on Action mutations", async () => {
    const ticket = await createTicket("520016");
    const { agent } = await login(staff);
    const response = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0018")
      .send(actionPayload);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("CSRF_INVALID");
    expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
  });

  it("validates trimmed Action text before creating any row", async () => {
    const ticket = await createTicket("520005");
    const { agent, csrfToken } = await login(staff);

    const response = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0005")
      .send({ ...actionPayload, description: "  too short  " });

    expect(response.status).toBe(400);
    expect(response.body.error.fieldErrors.description).toBeDefined();
  });

  it("accepts exact maximum lengths and rejects whitespace-only or oversized fields", async () => {
    const ticket = await createTicket("520017");
    const { agent, csrfToken } = await login(staff);
    const maximum = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0019")
      .send({
        actionDateTime: actionPayload.actionDateTime,
        description: "d".repeat(2000),
        result: "r".repeat(2000),
        followUpRequired: true,
        followUpNote: "f".repeat(2000),
        attachmentNotes: "a".repeat(2000),
      });
    const whitespace = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0020")
      .send({ ...actionPayload, result: " \t " });
    const oversized = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0021")
      .send({ ...actionPayload, result: "r".repeat(2001) });

    expect(maximum.status).toBe(201);
    expect(maximum.body.data.description).toHaveLength(2000);
    expect(whitespace.status).toBe(400);
    expect(whitespace.body.error.fieldErrors.result).toBeDefined();
    expect(oversized.status).toBe(400);
    expect(oversized.body.error.fieldErrors.result).toBeDefined();
    expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(1);
  });

  it("rejects a follow-up note when follow-up is not required", async () => {
    const ticket = await createTicket("520026");
    const { agent, csrfToken } = await login(staff);

    const response = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0030")
      .send({ ...actionPayload, followUpNote: "This note has no required follow-up" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fieldErrors.followUpNote).toBeDefined();
    expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
  });

  it("rejects Action edits that leave follow-up fields inconsistent without adding a revision", async () => {
    const ticketWithoutFollowUp = await createTicket("520027");
    const ticketWithFollowUp = await createTicket("520028");
    const { agent, csrfToken } = await login(staff);
    const withoutFollowUp = await agent.post(`/api/tickets/${ticketWithoutFollowUp.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0031")
      .send(actionPayload);
    const withFollowUp = await agent.post(`/api/tickets/${ticketWithFollowUp.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0032")
      .send({ ...actionPayload, followUpRequired: true, followUpNote: "Recheck after maintenance" });

    const irrelevantNote = await agent.patch(`/api/tickets/${ticketWithoutFollowUp.id}/actions/${withoutFollowUp.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, followUpNote: "This note has no required follow-up" });
    const missingRequiredNote = await agent.patch(`/api/tickets/${ticketWithFollowUp.id}/actions/${withFollowUp.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, followUpRequired: true, followUpNote: null });

    expect(irrelevantNote.status).toBe(400);
    expect(irrelevantNote.body.error.fieldErrors.followUpNote).toBeDefined();
    expect(missingRequiredNote.status).toBe(400);
    expect(missingRequiredNote.body.error.fieldErrors.followUpNote).toBeDefined();
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: withoutFollowUp.body.data.id } })).toMatchObject({ version: 1, followUpRequired: false, followUpNote: null });
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: withFollowUp.body.data.id } })).toMatchObject({ version: 1, followUpRequired: true, followUpNote: "Recheck after maintenance" });
    expect(await prisma.actionRevision.count({ where: { actionId: { in: [withoutFollowUp.body.data.id, withFollowUp.body.data.id] } } })).toBe(0);
  });

  it("requires the audited follow-up-resolution operation after an Action is completed", async () => {
    const ticket = await createTicket("520030");
    const { agent, csrfToken } = await login(staff);
    const created = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0034")
      .send({ ...actionPayload, followUpRequired: true, followUpNote: "Recheck after maintenance" });
    const completed = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, state: "COMPLETED" });

    const bypass = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 2, followUpRequired: false });

    expect(completed.status).toBe(200);
    expect(bypass.status).toBe(409);
    expect(bypass.body.error.code).toBe("CONFLICT");
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: created.body.data.id } })).toMatchObject({
      state: "COMPLETED",
      followUpRequired: true,
      followUpNote: "Recheck after maintenance",
      followUpResolvedAt: null,
      version: 2,
    });
    expect(await prisma.actionRevision.count({ where: { actionId: created.body.data.id } })).toBe(1);
  });

  it("returns no actions for a Ticket owned by another requester", async () => {
    const otherRequester = await prisma.user.findUniqueOrThrow({ where: { email: "michael.brown@example.com" }, select: { id: true } });
    const ticket = await createTicket("520006", { requesterId: otherRequester.id });
    const { agent } = await login(requester);

    const response = await agent.get(`/api/tickets/${ticket.id}/actions`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("records edits as prior-value revisions and rejects stale versions without another revision", async () => {
    const ticket = await createTicket("520007");
    const { agent, csrfToken } = await login(staff);
    const created = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0007")
      .send(actionPayload);
    expect(created.status).toBe(201);

    const updated = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, state: "IN_PROGRESS", result: "Verified the replacement adapter" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.version).toBe(2);
    expect(updated.body.data.state).toBe("IN_PROGRESS");

    const history = await agent.get(`/api/tickets/${ticket.id}/actions/${created.body.data.id}/revisions`);
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0]).toMatchObject({ version: 1, before: { result: actionPayload.result, version: 1 } });

    const stale = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, result: "A stale update must not overwrite current work" });
    expect(stale.status).toBe(409);
    expect((await agent.get(`/api/tickets/${ticket.id}/actions/${created.body.data.id}/revisions`)).body.data).toHaveLength(1);
  });

  it("accepts an updatedAt precondition and rejects stale timestamps without another revision", async () => {
    const ticket = await createTicket("520055");
    const { agent, csrfToken } = await login(staff);
    const created = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0055")
      .send(actionPayload);
    expect(created.status).toBe(201);

    const updated = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ updatedAt: created.body.data.updatedAt, result: "Verified with timestamp concurrency" });
    expect(updated.status).toBe(200);
    expect(Date.parse(updated.body.data.updatedAt)).toBeGreaterThan(Date.parse(created.body.data.updatedAt));

    const stale = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ updatedAt: created.body.data.updatedAt, result: "This stale timestamp must not overwrite work" });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("CONFLICT");
    expect(await prisma.actionRevision.count({ where: { actionId: created.body.data.id } })).toBe(1);
    expect((await prisma.actionTaken.findUniqueOrThrow({ where: { id: created.body.data.id } })).result).toBe("Verified with timestamp concurrency");
  });

  it("audits Action completion and resolves follow-up without reopening the Action", async () => {
    const ticket = await createTicket("520008");
    const { agent, csrfToken } = await login(staff);
    const created = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0008")
      .send({ ...actionPayload, followUpRequired: true, followUpNote: "Check again after maintenance" });
    expect(created.status).toBe(201);

    const completed = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, state: "COMPLETED" });
    expect(completed.status).toBe(200);
    expect(completed.body.data.completedAt).toBeTruthy();
    expect(completed.body.data.completedBy.id).toBeTruthy();

    const resolved = await agent.post(`/api/tickets/${ticket.id}/actions/${created.body.data.id}/follow-up-resolution`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 2 });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.state).toBe("COMPLETED");
    expect(resolved.body.data.followUpResolvedAt).toBeTruthy();
    expect(resolved.body.data.followUpResolvedBy.id).toBeTruthy();
    expect(resolved.body.data.version).toBe(3);

    const stale = await agent.post(`/api/tickets/${ticket.id}/actions/${created.body.data.id}/follow-up-resolution`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 2 });
    expect(stale.status).toBe(409);
  });

  it("does not allow a resolved follow-up audit to be cleared through a general edit", async () => {
    const ticket = await createTicket("520031");
    const { agent, csrfToken } = await login(staff);
    const created = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0035")
      .send({ ...actionPayload, followUpRequired: true, followUpNote: "Keep the audit trail after resolution" });
    const completed = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, state: "COMPLETED" });
    const resolved = await agent.post(`/api/tickets/${ticket.id}/actions/${created.body.data.id}/follow-up-resolution`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 2 });
    const cleared = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 3, followUpRequired: false });

    expect(completed.status).toBe(200);
    expect(resolved.status).toBe(200);
    expect(cleared.status).toBe(409);
    expect(cleared.body.error.code).toBe("CONFLICT");
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: created.body.data.id } })).toMatchObject({
      state: "COMPLETED",
      followUpRequired: true,
      followUpResolvedAt: expect.any(Date),
      version: 3,
    });
    expect(await prisma.actionRevision.count({ where: { actionId: created.body.data.id } })).toBe(2);
  });

  it("rejects an inactive assignee with field-specific validation", async () => {
    const ticket = await createTicket("520009");
    const inactive = await prisma.user.findUniqueOrThrow({ where: { email: "inactive.staff@example.com" }, select: { id: true } });
    const { agent, csrfToken } = await login(staff);

    const response = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0009")
      .send({ ...actionPayload, assigneeId: inactive.id });

    expect(response.status).toBe(400);
    expect(response.body.error.fieldErrors.assigneeId).toBeDefined();
  });

  it("accepts an active Staff assignee and returns it without exposing internal identifiers", async () => {
    const ticket = await createTicket("520012");
    const assignee = await prisma.user.findUniqueOrThrow({ where: { email: "casey.staff@example.com" }, select: { id: true } });
    const { agent, csrfToken } = await login(staff);
    const response = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0012")
      .send({ ...actionPayload, assigneeId: assignee.id });

    expect(response.status).toBe(201);
    expect(response.body.data.assignee).toMatchObject({ id: assignee.id, role: "IT_STAFF" });
    expect(response.body.data).not.toHaveProperty("idempotencyKey");
    expect(response.body.data).not.toHaveProperty("idempotencyFingerprint");
  });

  it("allows an Administrator to create an Action using the authenticated admin identity", async () => {
    const ticket = await createTicket("520018");
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: admin.email }, select: { id: true } });
    const { agent, csrfToken } = await login(admin);
    const response = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0022")
      .send(actionPayload);

    expect(response.status).toBe(201);
    expect(response.body.data.performedBy).toMatchObject({ id: adminUser.id, role: "ADMIN" });
  });

  it("supports reassigning and clearing an Action assignee while rejecting inactive targets", async () => {
    const ticket = await createTicket("520021");
    const activeAssignee = await prisma.user.findUniqueOrThrow({ where: { email: "casey.staff@example.com" }, select: { id: true } });
    const inactiveAssignee = await prisma.user.findUniqueOrThrow({ where: { email: "inactive.staff@example.com" }, select: { id: true } });
    const { agent, csrfToken } = await login(staff);
    const created = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0025")
      .send(actionPayload);
    const assigned = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, assigneeId: activeAssignee.id });
    const cleared = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 2, assigneeId: null });
    const rejected = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 3, assigneeId: inactiveAssignee.id });

    expect(assigned.status).toBe(200);
    expect(assigned.body.data.assignee.id).toBe(activeAssignee.id);
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.assignee).toBeNull();
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.fieldErrors.assigneeId).toBeDefined();
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: created.body.data.id } })).toMatchObject({ version: 3, assigneeId: null });
  });

  it("rejects malformed assignee IDs safely", async () => {
    const ticket = await createTicket("520013");
    const { agent, csrfToken } = await login(staff);
    const created = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0013")
      .send(actionPayload);
    const response = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, assigneeId: "not-an-id" });

    expect(response.status).toBe(400);
    expect(response.body.error.fieldErrors.assigneeId).toBeDefined();
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: created.body.data.id } })).toMatchObject({ version: 1, assigneeId: null });
  });

  it("returns Action items in stable chronological order", async () => {
    const ticket = await createTicket("520014");
    const { agent, csrfToken } = await login(staff);
    for (const [key, actionDateTime] of [
      ["b77c8f42-8e10-4fb5-9b03-e3f3d1df0014", "2026-10-29T10:30:00.000Z"],
      ["b77c8f42-8e10-4fb5-9b03-e3f3d1df0015", "2026-10-29T10:29:00.000Z"],
      ["b77c8f42-8e10-4fb5-9b03-e3f3d1df0016", "2026-10-29T10:30:00.000Z"],
    ]) {
      const response = await agent.post(`/api/tickets/${ticket.id}/actions`)
        .set("X-CSRF-Token", csrfToken)
        .set("Idempotency-Key", key)
        .send({ ...actionPayload, actionDateTime });
      expect(response.status).toBe(201);
    }
    const response = await agent.get(`/api/tickets/${ticket.id}/actions`);
    expect(response.status).toBe(200);
    expect(response.body.data.items.map((item: { actionDateTime: string }) => item.actionDateTime)).toEqual([
      "2026-10-29T10:29:00.000Z",
      "2026-10-29T10:30:00.000Z",
      "2026-10-29T10:30:00.000Z",
    ]);
    expect(response.body.data.items[1].id).toBeLessThan(response.body.data.items[2].id);
  });

  it("allows documented forward state changes and protects completed audit fields", async () => {
    const ticket = await createTicket("520015");
    const { agent, csrfToken } = await login(staff);
    const created = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0017")
      .send(actionPayload);
    const inProgress = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, state: "IN_PROGRESS" });
    const completed = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 2, state: "COMPLETED" });
    const terminalTransition = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 3, state: "IN_PROGRESS" });

    expect(inProgress.status).toBe(200);
    expect(completed.status).toBe(200);
    expect(completed.body.data.completedAt).toBeTruthy();
    expect(completed.body.data.completedBy.id).toBeTruthy();
    expect(terminalTransition.status).toBe(409);
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: created.body.data.id } })).toMatchObject({ state: "COMPLETED", version: 3 });
  });

  it("records cancellation audit and protects terminal Action transitions", async () => {
    const ticket = await createTicket("520019");
    const { agent, csrfToken } = await login(staff);
    const created = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0023")
      .send(actionPayload);
    const cancelled = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, state: "CANCELLED" });
    const terminal = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 2, state: "OPEN" });

    expect(created.status).toBe(201);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.cancelledAt).toBeTruthy();
    expect(cancelled.body.data.cancelledBy.id).toBeTruthy();
    expect(terminal.status).toBe(409);
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: created.body.data.id } })).toMatchObject({ state: "CANCELLED", version: 2 });

    const inProgressTicket = await createTicket("520029");
    const inProgressAction = await agent.post(`/api/tickets/${inProgressTicket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0033")
      .send(actionPayload);
    const started = await agent.patch(`/api/tickets/${inProgressTicket.id}/actions/${inProgressAction.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, state: "IN_PROGRESS" });
    const cancelledFromProgress = await agent.patch(`/api/tickets/${inProgressTicket.id}/actions/${inProgressAction.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 2, state: "CANCELLED" });

    expect(inProgressAction.status).toBe(201);
    expect(started.status).toBe(200);
    expect(cancelledFromProgress.status).toBe(200);
    expect(cancelledFromProgress.body.data).toMatchObject({ state: "CANCELLED", version: 3 });
    expect(cancelledFromProgress.body.data.cancelledBy.id).toBeTruthy();
  });

  it("rejects unlisted and terminal Action state transitions without adding a revision", async () => {
    const scenarios = [
      { suffix: "520022", key: "b77c8f42-8e10-4fb5-9b03-e3f3d1df0026", state: "IN_PROGRESS", target: "OPEN" },
      { suffix: "520023", key: "b77c8f42-8e10-4fb5-9b03-e3f3d1df0027", state: "COMPLETED", target: "IN_PROGRESS" },
      { suffix: "520024", key: "b77c8f42-8e10-4fb5-9b03-e3f3d1df0028", state: "CANCELLED", target: "OPEN" },
    ] as const;
    const { agent, csrfToken } = await login(staff);
    for (const scenario of scenarios) {
      const ticket = await createTicket(scenario.suffix);
      const created = await agent.post(`/api/tickets/${ticket.id}/actions`)
        .set("X-CSRF-Token", csrfToken)
        .set("Idempotency-Key", scenario.key)
        .send(actionPayload);
      const setup = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ version: 1, state: scenario.state });
      const rejected = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ version: 2, state: scenario.target });
      const history = await agent.get(`/api/tickets/${ticket.id}/actions/${created.body.data.id}/revisions`);

      expect(created.status).toBe(201);
      expect(setup.status).toBe(200);
      expect(rejected.status).toBe(409);
      expect(history.body.data).toHaveLength(1);
      expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: created.body.data.id } })).toMatchObject({ state: scenario.state, version: 2 });
    }
  });

  it("enforces immutable Action creation and terminal audit fields in PostgreSQL", async () => {
    const ticket = await createTicket("520020");
    const { agent, csrfToken } = await login(staff);
    const created = await agent.post(`/api/tickets/${ticket.id}/actions`)
      .set("X-CSRF-Token", csrfToken)
      .set("Idempotency-Key", "b77c8f42-8e10-4fb5-9b03-e3f3d1df0024")
      .send(actionPayload);
    const completed = await agent.patch(`/api/tickets/${ticket.id}/actions/${created.body.data.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: 1, state: "COMPLETED" });
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: admin.email }, select: { id: true } });

    await expect(prisma.actionTaken.update({ where: { id: created.body.data.id }, data: { performedById: adminUser.id } })).rejects.toThrow();
    await expect(prisma.actionTaken.update({ where: { id: created.body.data.id }, data: { completedById: adminUser.id } })).rejects.toThrow();
    const unchanged = await prisma.actionTaken.findUniqueOrThrow({ where: { id: created.body.data.id } });
    expect(completed.status).toBe(200);
    expect(unchanged.performedById).toBe(completed.body.data.performedBy.id);
    expect(unchanged.completedById).toBe(completed.body.data.completedBy.id);
  });
});
