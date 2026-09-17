import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";

const prisma = getPrisma();
const admin = { email: "admin@example.com", password: "AdminOne!2026" };
const requester = { email: "jennifer.anderson@example.com", password: "RequesterOne!2026" };
const createdEmail = "admin-issue39-created@example.com";

async function login(credentials: { email: string; password: string }) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send(credentials);
  expect(response.status).toBe(200);
  const csrf = await agent.get("/api/auth/csrf");
  expect(csrf.status).toBe(200);
  return { agent, csrfToken: csrf.body.data.csrfToken as string };
}

async function resetFixtures() {
  await prisma.authSession.deleteMany();
  await prisma.user.deleteMany({ where: { email: { in: [createdEmail, "admin-issue39-other@example.com"] } } });
  await prisma.user.update({
    where: { email: admin.email },
    data: { role: "ADMIN", active: true, passwordHash: await hashPassword(admin.password), mustChangePassword: false },
  });
  await prisma.user.update({
    where: { email: requester.email },
    data: { role: "REQUESTER", active: true, mustChangePassword: false },
  });
}

describe("Issue 39 Administrator user management", () => {
  beforeEach(resetFixtures);

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.user.deleteMany({ where: { email: { in: [createdEmail, "admin-issue39-other@example.com"] } } });
    await prisma.$disconnect();
  });

  it("lists safe users and enforces the Administrator boundary", async () => {
    const { agent } = await login(admin);
    const response = await agent.get("/api/admin/users?q=jennifer&role=REQUESTER");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([expect.objectContaining({ email: requester.email, role: "REQUESTER" })]);
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");

    const { agent: requesterAgent } = await login(requester);
    expect((await requesterAgent.get("/api/admin/users")).status).toBe(403);
  });

  it("creates, edits, deactivates, and resets an account without exposing credentials", async () => {
    const { agent, csrfToken } = await login(admin);
    const created = await agent.post("/api/admin/users").set("X-CSRF-Token", csrfToken).send({
      email: createdEmail,
      displayName: "Issue 39 User",
      role: "IT_STAFF",
      active: true,
      initialPassword: "Issue39Initial!2026",
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toEqual(expect.objectContaining({ email: createdEmail, role: "IT_STAFF", active: true, mustChangePassword: true }));
    expect(JSON.stringify(created.body)).not.toContain("Issue39Initial!2026");
    const userId = created.body.data.id as number;

    const edited = await agent.patch(`/api/admin/users/${userId}`).set("X-CSRF-Token", csrfToken).send({ displayName: "Updated Issue 39 User", active: false });
    expect(edited.status).toBe(200);
    expect(edited.body.data).toEqual(expect.objectContaining({ displayName: "Updated Issue 39 User", active: false }));
    expect((await request(app).post("/api/auth/login").send({ email: createdEmail, password: "Issue39Initial!2026" })).status).toBe(403);
    const reset = await agent.post(`/api/admin/users/${userId}/initial-password`).set("X-CSRF-Token", csrfToken).send({ initialPassword: "Issue39Reset!2026" });
    expect(reset.status).toBe(200);
    expect(reset.body.data).toEqual({ userId, mustChangePassword: true });
  });

  it("rejects duplicate email, invalid role, and administrator safety violations", async () => {
    const { agent, csrfToken } = await login(admin);
    const duplicate = await agent.post("/api/admin/users").set("X-CSRF-Token", csrfToken).send({ email: requester.email, displayName: "Duplicate", role: "REQUESTER", initialPassword: "DuplicateUser!2026" });
    expect(duplicate.status).toBe(409);
    const invalidRole = await agent.post("/api/admin/users").set("X-CSRF-Token", csrfToken).send({ email: "admin-issue39-other@example.com", displayName: "Bad Role", role: "SUPERUSER", initialPassword: "InvalidRoleUser!2026" });
    expect(invalidRole.status).toBe(400);
    const selfDeactivate = await agent.patch(`/api/admin/users/${(await prisma.user.findUniqueOrThrow({ where: { email: admin.email } })).id}`).set("X-CSRF-Token", csrfToken).send({ active: false });
    expect(selfDeactivate.status).toBe(409);
    const selfRoleChange = await agent.patch(`/api/admin/users/${(await prisma.user.findUniqueOrThrow({ where: { email: admin.email } })).id}`).set("X-CSRF-Token", csrfToken).send({ role: "REQUESTER" });
    expect(selfRoleChange.status).toBe(409);
  });
});
