import request from "supertest";
import { app } from "../src/app.js";
import { hashPassword } from "../src/auth.js";
import { getPrisma } from "../src/prisma.js";

export async function loginAs(email: string, password: string) {
  const prisma = getPrisma();
  await prisma.authSession.deleteMany();
  await prisma.user.update({ where: { email }, data: { passwordHash: await hashPassword(password), active: true, mustChangePassword: false } });
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send({ email, password });
  if (response.status !== 200) throw new Error(`Fixture login failed with ${response.status}`);
  const csrf = await agent.get("/api/auth/csrf");
  if (csrf.status !== 200) throw new Error(`Fixture CSRF failed with ${csrf.status}`);
  return { agent, csrfToken: csrf.body.data.csrfToken as string };
}

export const requesterOne = { email: "jennifer.anderson@example.com", password: "RequesterOne!2026" };
export const requesterTwo = { email: "michael.brown@example.com", password: "RequesterTwo!2026" };
