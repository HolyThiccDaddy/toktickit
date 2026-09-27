import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTicket,
  confirmationRequiredTransitions,
  currentStatus,
  login,
  prepareFixtures,
  prisma,
  rejectedStatusTransitions,
  requester,
  staff,
  validStatusTransitions,
} from "./staff-ticket-fixtures.js";

describe("Issue 38 IT Staff ticket detail operations", () => {
  beforeEach(prepareFixtures);

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.publicComment.deleteMany();
    await prisma.internalNote.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.$disconnect();
  });

  it("updates IT Priority without changing the formal status", async () => {
    const ticket = await createTicket("380005", { currentStatus: "IN_PROGRESS" });
    const { agent, csrfToken } = await login(staff);
    expect((await agent.patch(`/api/staff/tickets/${ticket.id}/priority`).set("X-CSRF-Token", csrfToken).send({ itPriority: "URGENT" })).status).toBe(200);
    expect(await currentStatus(ticket.id)).toBe("IN_PROGRESS");
  });

  it.each(validStatusTransitions)("allows the BR-08 transition $from -> $to", async ({ from, to, confirm }) => {
    const ticket = await createTicket("380005", { currentStatus: from });
    const { agent, csrfToken } = await login(staff);
    const response = await agent.patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: to, ...(confirm ? { confirm: true } : {}) });

    expect(response.status).toBe(200);
    expect(response.body.data.currentStatus).toBe(to);
    expect(await currentStatus(ticket.id)).toBe(to);
  });

  it.each(confirmationRequiredTransitions)("rejects $from -> $to without explicit confirmation and preserves status", async ({ from, to }) => {
    const ticket = await createTicket("380005", { currentStatus: from });
    const { agent, csrfToken } = await login(staff);

    for (const confirm of [undefined, false]) {
      const response = await agent.patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("X-CSRF-Token", csrfToken)
        .send({ status: to, ...(confirm === undefined ? {} : { confirm }) });
      expect(response.status).toBe(409);
      expect(await currentStatus(ticket.id)).toBe(from);
    }
  });

  it.each(rejectedStatusTransitions)("rejects the unlisted or terminal transition $from -> $to without mutation", async ({ from, to, ...transition }) => {
    const ticket = await createTicket("380005", { currentStatus: from });
    const { agent, csrfToken } = await login(staff);
    const response = await agent.patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: to, ...transition });

    expect(response.status).toBe(409);
    expect(await currentStatus(ticket.id)).toBe(from);
  });

  it("keeps public comments visible while protecting internal notes from requesters", async () => {
    const ticket = await createTicket("380006");
    const { agent: staffAgent, csrfToken: staffCsrf } = await login(staff);
    const note = await staffAgent.post(`/api/tickets/${ticket.id}/notes`).set("X-CSRF-Token", staffCsrf).send({ body: "Investigating the network path." });
    expect(note.status).toBe(201);
    const comment = await staffAgent.post(`/api/tickets/${ticket.id}/comments`).set("X-CSRF-Token", staffCsrf).send({ body: "IT is investigating this request." });
    expect(comment.status).toBe(201);
    expect((await staffAgent.get(`/api/staff/tickets/${ticket.id}`)).body.data.internalNotes).toHaveLength(1);
    expect((await staffAgent.get(`/api/tickets/${ticket.id}`)).body.data.internalNotes).toHaveLength(1);
    const { agent: requesterAgent } = await login(requester);
    const requesterDetail = await requesterAgent.get(`/api/tickets/${ticket.id}`);
    expect(requesterDetail.status).toBe(200);
    expect(requesterDetail.body.data.internalNotes).toBeUndefined();
    expect((await requesterAgent.get(`/api/tickets/${ticket.id}/notes`)).status).toBe(403);
  });
});
