import { createHash, randomBytes, scrypt, scryptSync, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { Router } from "express";
import { getPrisma } from "./prisma.js";

const scryptAsync = promisify(scrypt) as (password: string | Buffer, salt: string | Buffer, keylen: number, options?: ScryptOptions) => Promise<Buffer>;
const sessionCookieName = "toktickit_session";
const sessionLifetimeMs = 8 * 60 * 60 * 1000;
const csrfLifetimeMs = 8 * 60 * 60 * 1000;
const scryptOptions = { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 } as const;

export type AuthRole = "REQUESTER" | "IT_STAFF" | "ADMIN";

export type UserSummary = {
  id: number;
  email: string;
  displayName: string;
  role: AuthRole;
  active: boolean;
  mustChangePassword: boolean;
};

export type AuthContext = {
  sessionId: string;
  token: string;
  user: UserSummary;
  expiresAt: Date;
  csrfTokenHash: string | null;
  csrfExpiresAt: Date | null;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext | null;
    }
  }
}

const migrationPendingHash = "__MIGRATION_PENDING__";
const dummyHash = `scrypt$${scryptOptions.N}$${scryptOptions.r}$${scryptOptions.p}$${Buffer.from("toktickit-dummy-salt").toString("base64url")}$${scryptSync("toktickit-dummy-password", "toktickit-dummy-salt", 64, scryptOptions).toString("base64url")}`;

function encodeHash(salt: Buffer, derivedKey: Buffer) {
  return `scrypt$${scryptOptions.N}$${scryptOptions.r}$${scryptOptions.p}$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, 64, scryptOptions)) as Buffer;
  return encodeHash(salt, derivedKey);
}

export async function verifyPassword(password: string, encodedHash: string) {
  try {
    const [algorithm, n, r, p, saltText, keyText] = encodedHash.split("$");
    if (algorithm !== "scrypt" || n !== String(scryptOptions.N) || r !== String(scryptOptions.r) || p !== String(scryptOptions.p) || !saltText || !keyText) return false;
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(keyText, "base64url");
    if (salt.length < 16 || expected.length !== 64) return false;
    const actual = (await scryptAsync(password, salt, expected.length, scryptOptions)) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookies(header: string | undefined) {
  const cookies: Record<string, string> = {};
  for (const part of header?.split(";") ?? []) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function setSessionCookie(res: Response, token: string) {
  const secure = isProduction() ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; Max-Age=${sessionLifetimeMs / 1000}; HttpOnly; SameSite=Lax${secure}`);
}

function clearSessionCookie(res: Response) {
  const secure = isProduction() ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${sessionCookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`);
}

function safeUserSummary(user: { id: number; email: string; displayName: string; role: AuthRole; active: boolean; mustChangePassword: boolean }): UserSummary {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function resolveSession(req: Request): Promise<AuthContext | null> {
  const token = parseCookies(req.header("cookie"))[sessionCookieName];
  if (!token) return null;
  const session = await getPrisma().authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) return null;
  return {
    sessionId: session.id,
    token,
    user: safeUserSummary(session.user),
    expiresAt: session.expiresAt,
    csrfTokenHash: session.csrfTokenHash,
    csrfExpiresAt: session.csrfExpiresAt,
  };
}

function apiError(res: Response, status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
  return res.status(status).json({ error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } });
}

function pathAllowedDuringPasswordChange(path: string) {
  return [
    "/api/auth/login",
    "/api/auth/me",
    "/api/auth/csrf",
    "/api/auth/change-password",
    "/api/auth/logout",
  ].includes(path);
}

/** Attach a validated session and enforce the global first-login gate. */
export const sessionMiddleware: RequestHandler = async (req, res, next) => {
  try {
    const context = await resolveSession(req);
    req.auth = context;
    if (context?.user.mustChangePassword && req.path.startsWith("/api/") && !pathAllowedDuringPasswordChange(req.path)) {
      return apiError(res, 403, "PASSWORD_CHANGE_REQUIRED", "Change your password before continuing");
    }
    return next();
  } catch {
    return apiError(res, 500, "INTERNAL_ERROR", "Unable to validate session");
  }
};

export function requireAuth(options: { allowPasswordChange?: boolean } = {}): RequestHandler {
  return (req, res, next) => {
    if (!req.auth) return apiError(res, 401, "UNAUTHENTICATED", "Authentication is required");
    if (!options.allowPasswordChange && req.auth.user.mustChangePassword) {
      return apiError(res, 403, "PASSWORD_CHANGE_REQUIRED", "Change your password before continuing");
    }
    return next();
  };
}

export const requireCsrf: RequestHandler = async (req, res, next) => {
  if (!req.auth) return apiError(res, 401, "UNAUTHENTICATED", "Authentication is required");
  const presented = req.header("x-csrf-token");
  const expected = req.auth.csrfTokenHash;
  const actual = presented ? hashToken(presented) : "";
  const matches = expected && actual.length === expected.length
    ? timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
    : false;
  if (!presented || !expected || !req.auth.csrfExpiresAt || req.auth.csrfExpiresAt <= new Date() || !matches) {
    return apiError(res, 403, "CSRF_INVALID", "A valid CSRF token is required");
  }
  return next();
};

export function authRouter() {
  const router = Router();

  router.post("/login", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) return apiError(res, 400, "VALIDATION_ERROR", "Email and password are required", { email: "Email is required", password: "Password is required" });

    try {
      const user = await getPrisma().user.findUnique({ where: { email } });
      const valid = await verifyPassword(password, user?.passwordHash ?? dummyHash);
      if (!valid || !user) return apiError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
      if (!user.active) return apiError(res, 403, "ACCOUNT_INACTIVE", "This account is inactive");

      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + sessionLifetimeMs);
      const session = await getPrisma().authSession.create({
        data: { tokenHash: hashToken(token), userId: user.id, expiresAt },
      });
      setSessionCookie(res, token);
      return res.status(200).json({ data: { user: safeUserSummary(user), expiresAt: session.expiresAt.toISOString() } });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to sign in");
    }
  });

  router.post("/logout", requireAuth({ allowPasswordChange: true }), requireCsrf, async (req, res) => {
    try {
      await getPrisma().authSession.update({ where: { id: req.auth!.sessionId }, data: { revokedAt: new Date() } });
      clearSessionCookie(res);
      return res.status(204).send();
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to sign out");
    }
  });

  router.get("/me", requireAuth({ allowPasswordChange: true }), (req, res) => res.status(200).json({ data: req.auth!.user }));

  router.get("/csrf", requireAuth({ allowPasswordChange: true }), async (req, res) => {
    try {
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + csrfLifetimeMs);
      await getPrisma().authSession.update({ where: { id: req.auth!.sessionId }, data: { csrfTokenHash: hashToken(token), csrfExpiresAt: expiresAt } });
      req.auth!.csrfTokenHash = hashToken(token);
      req.auth!.csrfExpiresAt = expiresAt;
      return res.status(200).json({ data: { csrfToken: token, expiresAt: expiresAt.toISOString() } });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to issue CSRF token");
    }
  });

  router.post("/change-password", requireAuth({ allowPasswordChange: true }), requireCsrf, async (req, res) => {
    const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    const fieldErrors: Record<string, string> = {};
    if (!currentPassword) fieldErrors.currentPassword = "Current password is required";
    if (newPassword.length < 12 || newPassword.length > 128) fieldErrors.newPassword = "Password must be 12-128 characters";
    if (Object.keys(fieldErrors).length) return apiError(res, 400, "VALIDATION_ERROR", "Password change failed", fieldErrors);

    try {
      const user = await getPrisma().user.findUnique({ where: { id: req.auth!.user.id } });
      if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return apiError(res, 400, "VALIDATION_ERROR", "Password change failed", { currentPassword: "Current password is incorrect" });
      if (await verifyPassword(newPassword, user.passwordHash)) return apiError(res, 400, "VALIDATION_ERROR", "Password change failed", { newPassword: "New password must differ from the current password" });
      const passwordHash = await hashPassword(newPassword);
      const updated = await getPrisma().user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } });
      req.auth!.user = safeUserSummary(updated);
      return res.status(200).json({ data: req.auth!.user });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to change password");
    }
  });

  return router;
}

export { apiError, clearSessionCookie, migrationPendingHash, sessionCookieName, setSessionCookie };
