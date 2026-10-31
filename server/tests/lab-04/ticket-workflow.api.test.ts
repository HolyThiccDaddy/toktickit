import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTicket,
  currentStatus,
  login,
  prepareFixtures,
  prisma,
  requester,
  staff,
} from "../lab-03/staff-ticket-fixtures.js";

async function createAction(ticketId: number, options: { followUpRequired?: boolean } = {}) {
  const staffUser = await prisma.user.findUniqueOrThrow({ where: { email: staff.email }, select: { id: true } });
  const followUpRequired = options.followUpRequired === true;
  return prisma.actionTaken.create({
    data: {
      ticketId,
      actionDateTime: new Date("2026-01-01T12:00:00.000Z"),
      description: "Completed diagnostic and remediation work.",
      result: "The requested service behavior was restored.",
      state: "COMPLETED",
      performedById: staffUser.id,
      completedAt: new Date("2026-01-01T12:30:00.000Z"),
      completedById: staffUser.id,
      followUpRequired,
      followUpNote: followUpRequired ? "Confirm the service remains stable." : null,
      idempotencyKey: randomUUID(),
      idempotencyFingerprint: "a".repeat(64),
    },
  });
}

describe("Issue 4 ticket workflow and resolution gate", () => {
  beforeEach(prepareFixtures);

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.actionTaken.deleteMany();
    await prisma.publicComment.deleteMany();
    await prisma.internalNote.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.$disconnect();
  });

  it("requires a qualifying completed Action before resolving a ticket", async () => {
    const ticket = await createTicket("440001", { currentStatus: "IN_PROGRESS" });
    const { agent, csrfToken } = await login(staff);

    const response = await agent.patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: "RESOLVED", confirm: true });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/resolution action/i);
    expect(await currentStatus(ticket.id)).toBe("IN_PROGRESS");
  });

  it("rejects a resolution while a completed Action follow-up is outstanding", async () => {
    const ticket = await createTicket("440002", { currentStatus: "IN_PROGRESS" });
    const action = await createAction(ticket.id, { followUpRequired: true });
    const { agent, csrfToken } = await login(staff);

    const blocked = await agent.patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: "RESOLVED", confirm: true, resolutionActionId: action.id });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.message).toMatch(/follow-up/i);
    expect(await currentStatus(ticket.id)).toBe("IN_PROGRESS");

    const followUp = await agent.post(`/api/tickets/${ticket.id}/actions/${action.id}/follow-up-resolution`)
      .set("X-CSRF-Token", csrfToken)
      .send({ version: action.version });
    expect(followUp.status).toBe(200);

    const resolved = await agent.patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: "RESOLVED", confirm: true, resolutionActionId: action.id });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.currentStatus).toBe("RESOLVED");
  });

  it("uses the qualifying Action for RESOLVED and CLOSED transitions", async () => {
    const ticket = await createTicket("440003", { currentStatus: "IN_PROGRESS" });
    const action = await createAction(ticket.id);
    const { agent, csrfToken } = await login(staff);

    const resolved = await agent.patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: "RESOLVED", confirm: true, resolutionActionId: action.id });
    expect(resolved.status).toBe(200);

    const closed = await agent.patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: "CLOSED", confirm: true, resolutionActionId: action.id });
    expect(closed.status).toBe(200);
    expect(closed.body.data.currentStatus).toBe("CLOSED");
  });

  it("rejects an Action from another ticket and stale ticket timestamps", async () => {
    const ticket = await createTicket("440004", { currentStatus: "IN_PROGRESS" });
    const otherTicket = await createTicket("440005", { currentStatus: "IN_PROGRESS" });
    const otherAction = await createAction(otherTicket.id);
    const { agent, csrfToken } = await login(staff);

    const wrongAction = await agent.patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: "RESOLVED", confirm: true, resolutionActionId: otherAction.id });
    expect(wrongAction.status).toBe(409);
    expect(wrongAction.body.error.message).toMatch(/resolution action/i);

    const snapshot = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { updatedAt: true } });
    await prisma.ticket.update({ where: { id: ticket.id }, data: { summary: "Changed by another staff member", updatedAt: new Date(snapshot.updatedAt.getTime() + 2_000) } });
    const stale = await agent.patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: "WAITING_FOR_REQUESTER", updatedAt: snapshot.updatedAt.toISOString() });
    expect(stale.status).toBe(409);
    expect(stale.body.error.message).toMatch(/changed by another user/i);
    expect(await currentStatus(ticket.id)).toBe("IN_PROGRESS");
  });

  it("does not allow requesters to change workflow status", async () => {
    const ticket = await createTicket("440006", { currentStatus: "NEW" });
    const { agent, csrfToken } = await login(requester);
    const response = await agent.patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: "OPEN" });
    expect(response.status).toBe(403);
    expect(await currentStatus(ticket.id)).toBe("NEW");
  });
});
