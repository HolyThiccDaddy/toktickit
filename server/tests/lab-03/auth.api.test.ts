import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import { SEED_CREDENTIALS } from "../../prisma/seed.js";

const prisma = getPrisma();

describe("Lab 3 authentication API", () => {
  beforeEach(async () => {
    await prisma.authSession.deleteMany();
    await prisma.user.updateMany({
      data: { mustChangePassword: true },
    });
    await prisma.user.update({
      where: { id: SEED_CREDENTIALS.requesters[0].id },
      data: { passwordHash: await hashPassword(SEED_CREDENTIALS.requesters[0].password), active: true },
    });
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.$disconnect();
  });

  it("logs in an active seeded user and returns a safe session summary", async () => {
    const credential = SEED_CREDENTIALS.requesters[0];
    const response = await request(app).post("/api/auth/login").send(credential);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        user: expect.objectContaining({
          id: expect.any(Number),
          email: credential.email,
          displayName: expect.any(String),
          role: "REQUESTER",
          active: true,
          mustChangePassword: true,
        }),
        expiresAt: expect.any(String),
      },
    });
    expect(response.headers["set-cookie"]).toEqual([
      expect.stringMatching(/^toktickit_session=[^;]+; Path=\/; Max-Age=28800; HttpOnly; SameSite=Lax/),
    ]);
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    expect(JSON.stringify(response.body)).not.toContain(credential.password);
  });

  it("returns a generic error for invalid credentials and does not create a session", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: SEED_CREDENTIALS.requesters[0].email,
      password: "definitely-not-the-password",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    expect(await prisma.authSession.count()).toBe(0);
  });

  it("reveals inactive status only after the correct password is verified", async () => {
    const inactive = SEED_CREDENTIALS.requesters[4];
    const response = await request(app).post("/api/auth/login").send(inactive);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: "ACCOUNT_INACTIVE", message: "This account is inactive" } });
    expect(await prisma.authSession.count()).toBe(0);
  });

  it("supports current-session and CSRF lookup while the first-login gate is active", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send(SEED_CREDENTIALS.requesters[0]);
    expect(login.status).toBe(200);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data).toEqual(expect.objectContaining({ mustChangePassword: true }));

    const csrf = await agent.get("/api/auth/csrf");
    expect(csrf.status).toBe(200);
    expect(csrf.body.data).toEqual({ csrfToken: expect.any(String), expiresAt: expect.any(String) });

    const bypass = await agent.get("/api/tickets");
    expect(bypass.status).toBe(403);
    expect(bypass.body).toEqual({ error: { code: "PASSWORD_CHANGE_REQUIRED", message: "Change your password before continuing" } });
  });

  it("requires CSRF and a new policy-compliant password, then clears the first-login gate", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send(SEED_CREDENTIALS.requesters[0]);
    const csrf = await agent.get("/api/auth/csrf");
    const token = csrf.body.data.csrfToken as string;

    const missingCsrf = await agent.post("/api/auth/change-password").send({
      currentPassword: SEED_CREDENTIALS.requesters[0].password,
      newPassword: "A-new-password-2026!",
    });
    expect(missingCsrf.status).toBe(403);
    expect(missingCsrf.body.error.code).toBe("CSRF_INVALID");

    const changed = await agent.post("/api/auth/change-password")
      .set("X-CSRF-Token", token)
      .send({ currentPassword: SEED_CREDENTIALS.requesters[0].password, newPassword: "A-new-password-2026!" });
    expect(changed.status).toBe(200);
    expect(changed.body.data).toEqual(expect.objectContaining({ mustChangePassword: false }));

    const allowedTicketRoute = await agent.get("/api/tickets");
    expect(allowedTicketRoute.status).not.toBe(403);
    expect(allowedTicketRoute.body.error?.code).not.toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("invalidates logout and expired sessions", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send(SEED_CREDENTIALS.requesters[0]);
    expect((await agent.get("/api/auth/me")).status).toBe(200);

    const cookie = (await agent.get("/api/auth/me")).headers["set-cookie"];
    expect(cookie).toBeUndefined();
    const session = await prisma.authSession.findFirstOrThrow();
    await prisma.authSession.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
    expect((await agent.get("/api/auth/me")).status).toBe(401);

    await agent.post("/api/auth/login").send(SEED_CREDENTIALS.requesters[0]);
    const csrfAfterLogin = await agent.get("/api/auth/csrf");
    expect((await agent.post("/api/auth/logout").set("X-CSRF-Token", csrfAfterLogin.body.data.csrfToken)).status).toBe(204);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });
});
