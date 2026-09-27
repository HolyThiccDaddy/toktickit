import request from "supertest";
import { expect } from "vitest";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";

export const prisma = getPrisma();
export const staff = { email: "alex.staff@example.com", password: "StaffOne!2026" };
export const secondStaff = { email: "casey.staff@example.com", password: "StaffTwo!2026" };
export const inactiveStaff = { email: "inactive.staff@example.com", password: "StaffFour!2026" };
export const admin = { email: "admin@example.com", password: "AdminOne!2026" };
export const requester = { email: "jennifer.anderson@example.com", password: "RequesterOne!2026" };

export async function prepareFixtures() {
  await prisma.authSession.deleteMany();
  await prisma.publicComment.deleteMany();
  await prisma.internalNote.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  for (const fixture of [staff, secondStaff, inactiveStaff, admin, requester]) {
    await prisma.user.update({
      where: { email: fixture.email },
      data: { passwordHash: await hashPassword(fixture.password), mustChangePassword: false },
    });
  }
  await prisma.user.update({ where: { email: staff.email }, data: { active: true, role: "IT_STAFF" } });
  await prisma.user.update({ where: { email: secondStaff.email }, data: { active: true, role: "IT_STAFF" } });
  await prisma.user.update({ where: { email: inactiveStaff.email }, data: { active: false, role: "IT_STAFF" } });
  await prisma.user.update({ where: { email: admin.email }, data: { active: true, role: "ADMIN" } });
  await prisma.user.update({ where: { email: requester.email }, data: { active: true, role: "REQUESTER" } });
}

export async function login(credentials: { email: string; password: string }) {
  const agent = request.agent(app);
  expect((await agent.post("/api/auth/login").send(credentials)).status).toBe(200);
  const csrf = await agent.get("/api/auth/csrf");
  expect(csrf.status).toBe(200);
  return { agent, csrfToken: csrf.body.data.csrfToken as string };
}

export async function createTicket(suffix: string, data: Record<string, unknown> = {}) {
  return prisma.ticket.create({
    data: {
      ticketNumber: `TKT-2026-${suffix}`,
      summary: `Queue ticket ${suffix}`,
      description: "A ticket used to verify staff queue behavior.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      ...data,
    },
  });
}

export async function currentStatus(ticketId: number) {
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { currentStatus: true } });
  return ticket.currentStatus;
}

export const validStatusTransitions = [
  { from: "NEW", to: "OPEN", confirm: false },
  { from: "OPEN", to: "IN_PROGRESS", confirm: false },
  { from: "IN_PROGRESS", to: "WAITING_FOR_REQUESTER", confirm: false },
  { from: "WAITING_FOR_REQUESTER", to: "IN_PROGRESS", confirm: false },
  { from: "IN_PROGRESS", to: "RESOLVED", confirm: true },
  { from: "RESOLVED", to: "CLOSED", confirm: true },
  { from: "RESOLVED", to: "REOPENED", confirm: true },
  { from: "REOPENED", to: "IN_PROGRESS", confirm: false },
  { from: "NEW", to: "CANCELLED", confirm: true },
  { from: "OPEN", to: "CANCELLED", confirm: true },
  { from: "IN_PROGRESS", to: "CANCELLED", confirm: true },
  { from: "WAITING_FOR_REQUESTER", to: "CANCELLED", confirm: true },
  { from: "REOPENED", to: "CANCELLED", confirm: true },
] as const;

export const confirmationRequiredTransitions = validStatusTransitions.filter((transition) => transition.confirm);

export const rejectedStatusTransitions = [
  { from: "CLOSED", to: "OPEN", confirm: true },
  { from: "CANCELLED", to: "NEW", confirm: true },
  { from: "NEW", to: "IN_PROGRESS" },
  { from: "OPEN", to: "RESOLVED" },
  { from: "IN_PROGRESS", to: "CLOSED" },
  { from: "WAITING_FOR_REQUESTER", to: "RESOLVED" },
  { from: "RESOLVED", to: "IN_PROGRESS" },
  { from: "REOPENED", to: "CLOSED" },
] as const;
