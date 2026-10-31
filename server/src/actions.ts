import { createHash } from "node:crypto";
import { Router, type Request, type RequestHandler, type Response } from "express";
import type { Prisma } from "@prisma/client";
import { apiError, requireAuth, requireCsrf } from "./auth.js";
import { getPrisma } from "./prisma.js";

const personSelect = { id: true, displayName: true, role: true } as const;
const actionInclude = {
  assignee: { select: personSelect },
  performedBy: { select: personSelect },
  completedBy: { select: personSelect },
  cancelledBy: { select: personSelect },
  followUpResolvedBy: { select: personSelect },
  _count: { select: { revisions: true } },
} as const;
type ActionRecord = Prisma.ActionTakenGetPayload<{ include: typeof actionInclude }>;
type ActionState = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

class ActionError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

function sendError(res: Response, error: unknown, fallback: string) {
  if (error instanceof ActionError) {
    return apiError(res, error.status, error.code, error.message, error.fieldErrors);
  }
  return apiError(res, 500, "INTERNAL_ERROR", fallback);
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function isStaff(req: Request) {
  return req.auth?.user.role === "IT_STAFF" || req.auth?.user.role === "ADMIN";
}

const staffOnly: RequestHandler = (req, res, next) => {
  if (!isStaff(req)) return apiError(res, 403, "FORBIDDEN", "Only IT Staff or Administrators may change Actions Taken");
  return next();
};

async function visibleTicket(ticketId: number, req: Request) {
  const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true, requesterId: true } });
  if (!ticket) return null;
  if (req.auth?.user.role === "REQUESTER" && ticket.requesterId !== req.auth.user.id) return null;
  return ticket;
}

function safePerson(user: ActionRecord["assignee"]) {
  return user ? { id: user.id, displayName: user.displayName, role: user.role } : null;
}

function actionMetadata(action: ActionRecord) {
  return {
    id: action.id,
    ticketId: action.ticketId,
    actionDateTime: action.actionDateTime.toISOString(),
    description: action.description,
    result: action.result,
    state: action.state,
    assignee: safePerson(action.assignee),
    performedBy: safePerson(action.performedBy),
    completedAt: action.completedAt?.toISOString() ?? null,
    completedBy: safePerson(action.completedBy),
    cancelledAt: action.cancelledAt?.toISOString() ?? null,
    cancelledBy: safePerson(action.cancelledBy),
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote,
    followUpResolvedAt: action.followUpResolvedAt?.toISOString() ?? null,
    followUpResolvedBy: safePerson(action.followUpResolvedBy),
    attachmentNotes: action.attachmentNotes,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
    version: action.version,
    revisionCount: action._count.revisions,
  };
}

function canonicalTimestamp(value: unknown) {
  if (typeof value !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function optionalText(value: unknown, field: string, fieldErrors: Record<string, string>, required: boolean, max: number) {
  if (value === undefined || value === null) {
    if (required) fieldErrors[field] = `${field} is required`;
    return null;
  }
  if (typeof value !== "string") {
    fieldErrors[field] = `${field} must be text`;
    return null;
  }
  const text = value.trim();
  if ((required && (text.length < (field === "description" ? 10 : 1) || text.length > max)) || (!required && text.length > max)) {
    fieldErrors[field] = field === "description" ? "Description must be 10-2000 characters" : `${field} must be 1-${max} characters`;
    return null;
  }
  if (!required && text.length === 0) {
    fieldErrors[field] = `${field} must contain at least one character when provided`;
    return null;
  }
  return text;
}

type CreatePayload = {
  actionDateTime: Date;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  assigneeId: number | null;
};

function validateCreate(body: unknown): { payload: CreatePayload | null; fieldErrors: Record<string, string> } {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const fieldErrors: Record<string, string> = {};
  const actionDateTime = canonicalTimestamp(value.actionDateTime);
  if (!actionDateTime) fieldErrors.actionDateTime = "Action date and time must include a valid time zone";
  const description = optionalText(value.description, "description", fieldErrors, true, 2000);
  const result = optionalText(value.result, "result", fieldErrors, true, 2000);
  if (typeof value.followUpRequired !== "boolean") fieldErrors.followUpRequired = "Follow-up required must be a boolean";
  const followUpRequired = value.followUpRequired === true;
  const followUpNote = value.followUpRequired === true
    ? optionalText(value.followUpNote, "followUpNote", fieldErrors, true, 2000)
    : value.followUpNote === undefined || value.followUpNote === null
      ? null
      : (fieldErrors.followUpNote = "Follow-up note must be omitted unless follow-up is required", null);
  const attachmentNotes = value.attachmentNotes === undefined || value.attachmentNotes === null
    ? null
    : optionalText(value.attachmentNotes, "attachmentNotes", fieldErrors, false, 2000);
  const assigneeId = value.assigneeId === undefined || value.assigneeId === null
    ? null
    : typeof value.assigneeId === "number" ? value.assigneeId : Number.NaN;
  if (assigneeId !== null && (!Number.isSafeInteger(assigneeId) || assigneeId <= 0)) fieldErrors.assigneeId = "Assignee is invalid";

  if (Object.keys(fieldErrors).length || !actionDateTime || !description || !result || typeof value.followUpRequired !== "boolean") {
    return { payload: null, fieldErrors };
  }
  return {
    payload: { actionDateTime, description, result, followUpRequired, followUpNote, attachmentNotes, assigneeId },
    fieldErrors,
  };
}

function fingerprint(payload: CreatePayload) {
  const normalized = {
    actionDateTime: payload.actionDateTime.toISOString(),
    description: payload.description,
    result: payload.result,
    followUpRequired: payload.followUpRequired,
    followUpNote: payload.followUpNote,
    attachmentNotes: payload.attachmentNotes,
    assigneeId: payload.assigneeId,
  };
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function snapshot(action: ActionRecord): Prisma.InputJsonObject {
  return {
    actionDateTime: action.actionDateTime.toISOString(),
    description: action.description,
    result: action.result,
    state: action.state,
    assigneeId: action.assigneeId,
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote,
    followUpResolvedAt: action.followUpResolvedAt?.toISOString() ?? null,
    followUpResolvedById: action.followUpResolvedById,
    attachmentNotes: action.attachmentNotes,
    version: action.version,
  };
}

function assertVersion(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new ActionError(400, "VALIDATION_ERROR", "Action update failed", { version: "A positive version is required" });
  }
  return Number(value);
}

type ActionPrecondition = { version: number } | { updatedAt: Date };

function actionPrecondition(body: unknown): ActionPrecondition {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const hasVersion = Object.hasOwn(value, "version");
  const hasUpdatedAt = Object.hasOwn(value, "updatedAt");
  if (hasVersion === hasUpdatedAt) {
    throw new ActionError(400, "VALIDATION_ERROR", "Action update failed", { precondition: "Provide exactly one positive version or valid updatedAt value" });
  }
  if (hasVersion) return { version: assertVersion(value.version) };
  const updatedAt = canonicalTimestamp(value.updatedAt);
  if (!updatedAt) {
    throw new ActionError(400, "VALIDATION_ERROR", "Action update failed", { updatedAt: "A valid timezone-aware updatedAt value is required" });
  }
  return { updatedAt };
}

function assertTransition(from: ActionState, to: ActionState) {
  if (from === to) return;
  const allowed: Record<ActionState, ActionState[]> = {
    OPEN: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  if (!allowed[from].includes(to)) throw new ActionError(409, "CONFLICT", "This Action state transition is not allowed");
}

export function createActionsRouter() {
  const router = Router();
  router.use(requireAuth());

  router.get("/:ticketId/actions", async (req, res) => {
    const ticketId = parseId(req.params.ticketId);
    if (ticketId === null) return apiError(res, 404, "NOT_FOUND", "Ticket not found");
    try {
      if (!(await visibleTicket(ticketId, req))) return apiError(res, 404, "NOT_FOUND", "Ticket not found");
      const items = await getPrisma().actionTaken.findMany({ where: { ticketId }, orderBy: [{ actionDateTime: "asc" }, { id: "asc" }], include: actionInclude });
      return res.status(200).json({ data: { items: items.map(actionMetadata), meta: { page: 1, pageSize: items.length, total: items.length, totalPages: items.length ? 1 : 0 } } });
    } catch (error) {
      return sendError(res, error, "Unable to load Actions Taken");
    }
  });

  router.post("/:ticketId/actions", staffOnly, requireCsrf, async (req, res) => {
    const ticketId = parseId(req.params.ticketId);
    if (ticketId === null) return apiError(res, 404, "NOT_FOUND", "Ticket not found");
    const key = req.header("idempotency-key")?.trim().toLowerCase() ?? "";
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(key)) {
      return apiError(res, 400, "VALIDATION_ERROR", "Action creation failed", { idempotencyKey: "A canonical UUID Idempotency-Key is required" });
    }
    const { payload, fieldErrors } = validateCreate(req.body);
    if (!payload) return apiError(res, 400, "VALIDATION_ERROR", "Action creation failed", fieldErrors);
    try {
      if (!(await visibleTicket(ticketId, req))) return apiError(res, 404, "NOT_FOUND", "Ticket not found");
      const payloadFingerprint = fingerprint(payload);
      const record = await getPrisma().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
        const existing = await tx.actionTaken.findUnique({ where: { ticketId_idempotencyKey: { ticketId, idempotencyKey: key } }, include: actionInclude });
        if (existing) {
          if (existing.idempotencyFingerprint !== payloadFingerprint) throw new ActionError(409, "CONFLICT", "Idempotency key was already used with a different Action payload");
          return { body: existing.idempotencyResponse ?? actionMetadata(existing), replayed: true };
        }
        if (payload.assigneeId !== null) {
          const eligible = await tx.user.findFirst({ where: { id: payload.assigneeId, active: true, role: { in: ["IT_STAFF", "ADMIN"] } }, select: { id: true } });
          if (!eligible) throw new ActionError(400, "VALIDATION_ERROR", "Action creation failed", { assigneeId: "Assignee must be an active IT Staff member or Administrator" });
        }
        const createdAt = new Date();
        const action = await tx.actionTaken.create({
          data: {
            ticketId,
            ...payload,
            performedById: req.auth!.user.id,
            idempotencyKey: key,
            idempotencyFingerprint: payloadFingerprint,
            createdAt,
            updatedAt: createdAt,
          },
          include: actionInclude,
        });
        const responseBody = actionMetadata(action);
        await tx.actionTaken.update({ where: { id: action.id }, data: { idempotencyResponse: responseBody as Prisma.InputJsonValue, updatedAt: createdAt } });
        return { body: responseBody, replayed: false };
      });
      if (record.replayed) res.setHeader("Idempotency-Replayed", "true");
      return res.status(201).json({ data: record.body });
    } catch (error) {
      return sendError(res, error, "Unable to create Action Taken");
    }
  });

  router.patch("/:ticketId/actions/:actionId", staffOnly, requireCsrf, async (req, res) => {
    const ticketId = parseId(req.params.ticketId);
    const actionId = parseId(req.params.actionId);
    if (ticketId === null || actionId === null) return apiError(res, 404, "NOT_FOUND", "Action Taken not found");
    let precondition: ActionPrecondition;
    try { precondition = actionPrecondition(req.body); }
    catch (error) { return sendError(res, error, "Action update failed"); }
    const fieldErrors: Record<string, string> = {};
    const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    const update: Prisma.ActionTakenUncheckedUpdateInput = {};
    let assigneeId: number | null = null;
    if (Object.hasOwn(body, "assigneeId") && body.assigneeId !== null) {
      assigneeId = typeof body.assigneeId === "number" ? body.assigneeId : Number.NaN;
      if (!Number.isSafeInteger(assigneeId) || assigneeId <= 0) fieldErrors.assigneeId = "Assignee is invalid";
    }
    if (Object.keys(fieldErrors).length) return apiError(res, 400, "VALIDATION_ERROR", "Action update failed", fieldErrors);
    if (Object.hasOwn(body, "actionDateTime")) {
      const date = canonicalTimestamp(body.actionDateTime);
      if (!date) fieldErrors.actionDateTime = "Action date and time must include a valid time zone";
      else update.actionDateTime = date;
    }
    for (const field of ["description", "result"] as const) {
      if (Object.hasOwn(body, field)) {
        const text = optionalText(body[field], field, fieldErrors, true, 2000);
        if (text) update[field] = text;
      }
    }
    if (Object.hasOwn(body, "assigneeId")) update.assigneeId = assigneeId;
    if (Object.hasOwn(body, "followUpRequired")) {
      if (typeof body.followUpRequired !== "boolean") fieldErrors.followUpRequired = "Follow-up required must be a boolean";
      else update.followUpRequired = body.followUpRequired;
    }
    if (Object.hasOwn(body, "followUpNote")) update.followUpNote = body.followUpNote === null ? null : typeof body.followUpNote === "string" ? body.followUpNote.trim() : undefined;
    if (Object.hasOwn(body, "attachmentNotes")) update.attachmentNotes = body.attachmentNotes === null ? null : typeof body.attachmentNotes === "string" ? body.attachmentNotes.trim() : undefined;
    if (Object.hasOwn(body, "followUpNote") && body.followUpNote !== null) {
      const text = optionalText(body.followUpNote, "followUpNote", fieldErrors, false, 2000);
      update.followUpNote = text;
    }
    if (Object.hasOwn(body, "attachmentNotes") && body.attachmentNotes !== null) {
      const text = optionalText(body.attachmentNotes, "attachmentNotes", fieldErrors, false, 2000);
      update.attachmentNotes = text;
    }
    if (Object.keys(fieldErrors).length) return apiError(res, 400, "VALIDATION_ERROR", "Action update failed", fieldErrors);

    try {
      await getPrisma().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
        const current = await tx.actionTaken.findFirst({ where: { id: actionId, ticketId }, include: actionInclude });
        if (!current) throw new ActionError(404, "NOT_FOUND", "Action Taken not found");
        if (("version" in precondition && current.version !== precondition.version)
          || ("updatedAt" in precondition && current.updatedAt.getTime() !== precondition.updatedAt.getTime())) {
          throw new ActionError(409, "CONFLICT", "Action Taken was changed by another user; reload before saving");
        }
        if (current.state === "COMPLETED" && current.followUpRequired && !current.followUpResolvedAt
          && ((Object.hasOwn(body, "followUpRequired") && body.followUpRequired === false)
            || (Object.hasOwn(body, "followUpNote") && body.followUpNote === null))) {
          throw new ActionError(409, "CONFLICT", "Resolve an outstanding completed Action follow-up through the dedicated operation");
        }
        if (current.followUpResolvedAt
          && ((Object.hasOwn(body, "followUpRequired") && body.followUpRequired === false)
            || (Object.hasOwn(body, "followUpNote") && body.followUpNote === null))) {
          throw new ActionError(409, "CONFLICT", "A resolved Action follow-up cannot be cleared through a general update");
        }
        if (Object.hasOwn(body, "assigneeId") && assigneeId !== null) {
          const eligible = await tx.user.findFirst({ where: { id: assigneeId, active: true, role: { in: ["IT_STAFF", "ADMIN"] } }, select: { id: true } });
          if (!eligible) throw new ActionError(400, "VALIDATION_ERROR", "Action update failed", { assigneeId: "Assignee must be an active IT Staff member or Administrator" });
        }
        if (Object.hasOwn(body, "followUpRequired") && body.followUpRequired === false && !Object.hasOwn(body, "followUpNote")) update.followUpNote = null;
        const nextFollowUpRequired = Object.hasOwn(body, "followUpRequired") ? body.followUpRequired === true : current.followUpRequired;
        const nextFollowUpNote = Object.hasOwn(update, "followUpNote") ? update.followUpNote : current.followUpNote;
        if (nextFollowUpRequired && (typeof nextFollowUpNote !== "string" || !nextFollowUpNote.trim())) {
          throw new ActionError(400, "VALIDATION_ERROR", "Action update failed", { followUpNote: "A follow-up note is required" });
        }
        if (!nextFollowUpRequired && nextFollowUpNote !== null) {
          throw new ActionError(400, "VALIDATION_ERROR", "Action update failed", { followUpNote: "Follow-up note must be omitted unless follow-up is required" });
        }
        const nextState = Object.hasOwn(body, "state") ? body.state : current.state;
        if (typeof nextState !== "string" || !["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(nextState)) {
          throw new ActionError(400, "VALIDATION_ERROR", "Action update failed", { state: "Action state is invalid" });
        }
        assertTransition(current.state, nextState as ActionState);
        if (!Object.keys(update).length && nextState === current.state) throw new ActionError(400, "VALIDATION_ERROR", "Action update failed", { body: "At least one editable field is required" });
        await tx.actionRevision.create({ data: { actionId, version: current.version, before: snapshot(current), changedById: req.auth!.user.id } });
        const now = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
        if (nextState !== current.state) {
          update.state = nextState as ActionState;
          if (nextState === "COMPLETED") { update.completedAt = now; update.completedById = req.auth!.user.id; }
          if (nextState === "CANCELLED") { update.cancelledAt = now; update.cancelledById = req.auth!.user.id; }
        }
        await tx.actionTaken.update({ where: { id: actionId }, data: { ...update, version: { increment: 1 }, updatedAt: now } });
      });
      const updated = await getPrisma().actionTaken.findUnique({ where: { id: actionId }, include: actionInclude });
      if (!updated) return apiError(res, 404, "NOT_FOUND", "Action Taken not found");
      return res.status(200).json({ data: actionMetadata(updated) });
    } catch (error) {
      return sendError(res, error, "Unable to update Action Taken");
    }
  });

  router.get("/:ticketId/actions/:actionId/revisions", async (req, res) => {
    const ticketId = parseId(req.params.ticketId);
    const actionId = parseId(req.params.actionId);
    if (ticketId === null || actionId === null) return apiError(res, 404, "NOT_FOUND", "Action Taken not found");
    try {
      if (!(await visibleTicket(ticketId, req))) return apiError(res, 404, "NOT_FOUND", "Ticket not found");
      const action = await getPrisma().actionTaken.findFirst({ where: { id: actionId, ticketId }, select: { id: true } });
      if (!action) return apiError(res, 404, "NOT_FOUND", "Action Taken not found");
      const revisions = await getPrisma().actionRevision.findMany({ where: { actionId }, orderBy: [{ version: "asc" }, { id: "asc" }], include: { changedBy: { select: personSelect } } });
      return res.status(200).json({ data: revisions.map((revision) => ({ id: revision.id, actionId: revision.actionId, version: revision.version, before: revision.before, changedBy: safePerson(revision.changedBy), changedAt: revision.changedAt.toISOString() })) });
    } catch (error) {
      return sendError(res, error, "Unable to load Action Taken history");
    }
  });

  router.post("/:ticketId/actions/:actionId/follow-up-resolution", staffOnly, requireCsrf, async (req, res) => {
    const ticketId = parseId(req.params.ticketId);
    const actionId = parseId(req.params.actionId);
    if (ticketId === null || actionId === null) return apiError(res, 404, "NOT_FOUND", "Action Taken not found");
    let version: number;
    try { version = assertVersion(req.body?.version); } catch (error) { return sendError(res, error, "Follow-up resolution failed"); }
    try {
      if (!(await visibleTicket(ticketId, req))) return apiError(res, 404, "NOT_FOUND", "Ticket not found");
      await getPrisma().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
        const current = await tx.actionTaken.findFirst({ where: { id: actionId, ticketId }, include: actionInclude });
        if (!current) throw new ActionError(404, "NOT_FOUND", "Action Taken not found");
        if (current.version !== version) throw new ActionError(409, "CONFLICT", "Action Taken was changed by another user; reload before saving");
        if (current.state !== "COMPLETED" || !current.followUpRequired || current.followUpResolvedAt) {
          throw new ActionError(409, "CONFLICT", "This Action has no outstanding follow-up to resolve");
        }
        const now = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
        await tx.actionRevision.create({ data: { actionId, version: current.version, before: snapshot(current), changedById: req.auth!.user.id } });
        await tx.actionTaken.update({ where: { id: actionId }, data: { followUpResolvedAt: now, followUpResolvedById: req.auth!.user.id, version: { increment: 1 }, updatedAt: now } });
      });
      const updated = await getPrisma().actionTaken.findUnique({ where: { id: actionId }, include: actionInclude });
      if (!updated) return apiError(res, 404, "NOT_FOUND", "Action Taken not found");
      return res.status(200).json({ data: actionMetadata(updated) });
    } catch (error) {
      return sendError(res, error, "Unable to resolve Action follow-up");
    }
  });

  return router;
}
