import { Router, type Request, type RequestHandler } from "express";
import { Prisma, type PrismaClient, type User, type UserRole } from "@prisma/client";
import { apiError, hashPassword, requireAuth, requireCsrf } from "./auth.js";
import { getPrisma } from "./prisma.js";
import { safeUser, validationError } from "./tickets.js";

const roles = ["REQUESTER", "IT_STAFF", "ADMIN"] as const;
type AdminRole = (typeof roles)[number];

function isRole(value: unknown): value is AdminRole {
  return typeof value === "string" && roles.includes(value as AdminRole);
}

function parseUserId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function adminOnly(req: Request, res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  if (req.auth?.user.role !== "ADMIN") return apiError(res, 403, "FORBIDDEN", "Only Administrators may access user management");
  return next();
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePassword(value: unknown) {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}

function duplicateEmail(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function serializationConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

type AdminUpdateOutcome =
  | { kind: "not-found" }
  | { kind: "conflict"; message: string }
  | { kind: "updated"; user: User };
type AdminUpdateData = { email?: string; displayName?: string; role?: UserRole; active?: boolean };

export async function updateAdminUserRecord(
  prisma: PrismaClient,
  userId: number,
  actorId: number,
  data: AdminUpdateData,
): Promise<AdminUpdateOutcome> {
  let outcome: AdminUpdateOutcome | null = null;
  let exhaustedSerializationRetries = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      outcome = await prisma.$transaction(async (tx): Promise<AdminUpdateOutcome> => {
        const target = await tx.user.findUnique({ where: { id: userId } });
        if (!target) return { kind: "not-found" };
        const nextRole = data.role ?? target.role;
        const nextActive = data.active ?? target.active;
        const isSelf = actorId === userId;
        if (isSelf && (!nextActive || nextRole !== "ADMIN")) {
          return { kind: "conflict", message: "An Administrator cannot deactivate or change their own role" };
        }
        if (target.role === "ADMIN" && target.active && (!nextActive || nextRole !== "ADMIN")) {
          const activeAdmins = await tx.user.count({ where: { role: "ADMIN", active: true } });
          if (activeAdmins <= 1) {
            return { kind: "conflict", message: "The last active Administrator cannot be deactivated or demoted" };
          }
        }
        const updated = await tx.user.update({ where: { id: userId }, data });
        if (!nextActive) {
          await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
        }
        return { kind: "updated", user: updated };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      break;
    } catch (error) {
      if (serializationConflict(error) && attempt < 2) continue;
      if (serializationConflict(error)) {
        exhaustedSerializationRetries = true;
        break;
      }
      throw error;
    }
  }
  if (exhaustedSerializationRetries || !outcome) {
    return { kind: "conflict", message: "The user update conflicted with another administrator change; please retry" };
  }
  return outcome;
}

export function createAdminRouter() {
  const router = Router();
  router.use(requireAuth(), adminOnly);

  router.get("/users", async (req, res) => {
    const allowed = new Set(["q", "role"]);
    if (Object.entries(req.query).some(([key, value]) => !allowed.has(key) || Array.isArray(value))) {
      return validationError(res, { query: "Unknown or repeated user query parameter" });
    }
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const role = typeof req.query.role === "string" && req.query.role ? req.query.role : undefined;
    if (role !== undefined && !isRole(role)) return validationError(res, { role: "Role must be REQUESTER, IT_STAFF, or ADMIN" });
    try {
      const users = await getPrisma().user.findMany({
        where: {
          ...(role ? { role: role as UserRole } : {}),
          ...(q ? { OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ] } : {}),
        },
        orderBy: [{ displayName: "asc" }, { id: "asc" }],
      });
      return res.status(200).json({ data: users.map(safeUser) });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to load users");
    }
  });

  router.post("/users", requireCsrf, async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim() : "";
    const role = req.body?.role;
    const active = req.body?.active === undefined ? true : req.body.active;
    const initialPassword = req.body?.initialPassword;
    const errors: Record<string, string> = {};
    if (!validEmail(email)) errors.email = "Enter a valid email address";
    if (!displayName || displayName.length > 120) errors.displayName = "Display name must be 1-120 characters";
    if (!isRole(role)) errors.role = "Role must be REQUESTER, IT_STAFF, or ADMIN";
    if (typeof active !== "boolean") errors.active = "Active must be a boolean";
    if (!validatePassword(initialPassword)) errors.initialPassword = "Initial password must be 12-128 characters";
    if (Object.keys(errors).length) return validationError(res, errors);
    try {
      const user = await getPrisma().user.create({
        data: {
          email,
          displayName,
          role: role as UserRole,
          active,
          passwordHash: await hashPassword(initialPassword as string),
          mustChangePassword: true,
        },
      });
      return res.status(201).json({ data: safeUser(user) });
    } catch (error) {
      if (duplicateEmail(error)) return apiError(res, 409, "CONFLICT", "A user with this email already exists");
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to create user");
    }
  });

  router.patch("/users/:userId", requireCsrf, async (req, res) => {
    const userId = parseUserId(req.params.userId);
    if (userId === null) return apiError(res, 404, "NOT_FOUND", "User not found");
    const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    const allowed = new Set(["email", "displayName", "role", "active"]);
    const supplied = Object.keys(body);
    if (!supplied.length || supplied.some((key) => !allowed.has(key))) return validationError(res, { user: "Provide at least one supported user field" });
    const data: AdminUpdateData = {};
    const errors: Record<string, string> = {};
    if (Object.prototype.hasOwnProperty.call(body, "email")) {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!validEmail(email)) errors.email = "Enter a valid email address";
      else data.email = email;
    }
    if (Object.prototype.hasOwnProperty.call(body, "displayName")) {
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
      if (!displayName || displayName.length > 120) errors.displayName = "Display name must be 1-120 characters";
      else data.displayName = displayName;
    }
    if (Object.prototype.hasOwnProperty.call(body, "role")) {
      if (!isRole(body.role)) errors.role = "Role must be REQUESTER, IT_STAFF, or ADMIN";
      else data.role = body.role as UserRole;
    }
    if (Object.prototype.hasOwnProperty.call(body, "active")) {
      if (typeof body.active !== "boolean") errors.active = "Active must be a boolean";
      else data.active = body.active;
    }
    if (Object.keys(errors).length) return validationError(res, errors);

    try {
      const prisma = getPrisma();
      const outcome = await updateAdminUserRecord(prisma, userId, req.auth!.user.id, data);
      if (outcome.kind === "not-found") return apiError(res, 404, "NOT_FOUND", "User not found");
      if (outcome.kind === "conflict") return apiError(res, 409, "CONFLICT", outcome.message);
      return res.status(200).json({ data: safeUser(outcome.user) });
    } catch (error) {
      if (duplicateEmail(error)) return apiError(res, 409, "CONFLICT", "A user with this email already exists");
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to update user");
    }
  });

  router.post("/users/:userId/initial-password", requireCsrf, async (req, res) => {
    const userId = parseUserId(req.params.userId);
    if (userId === null) return apiError(res, 404, "NOT_FOUND", "User not found");
    const initialPassword = req.body?.initialPassword;
    if (!validatePassword(initialPassword)) return validationError(res, { initialPassword: "Initial password must be 12-128 characters" });
    try {
      const passwordHash = await hashPassword(initialPassword as string);
      const prisma = getPrisma();
      const updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: true } });
        await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
        return user;
      });
      return res.status(200).json({ data: { userId: updated.id, mustChangePassword: true } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return apiError(res, 404, "NOT_FOUND", "User not found");
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to reset the initial password");
    }
  });

  return router;
}
