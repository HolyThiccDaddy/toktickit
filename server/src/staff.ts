import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import type { Prisma } from "@prisma/client";
import { apiError, requireAuth, requireCsrf } from "./auth.js";
import { getPrisma } from "./prisma.js";
import {
  internalNoteMetadata,
  notFound,
  parseTicketId,
  publicCommentMetadata,
  safeUser,
  ticketInclude,
  ticketMetadata,
  userSelect,
  validationError,
} from "./tickets.js";

const staffRoles = new Set(["IT_STAFF", "ADMIN"] as const);
const priorities = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"] as const);
const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
type StaffStatus = (typeof statuses)[number];

const transitionRules: Record<StaffStatus, Partial<Record<StaffStatus, boolean>>> = {
  NEW: { OPEN: false, CANCELLED: true },
  OPEN: { IN_PROGRESS: false, CANCELLED: true },
  IN_PROGRESS: { WAITING_FOR_REQUESTER: false, RESOLVED: true, CANCELLED: true },
  WAITING_FOR_REQUESTER: { IN_PROGRESS: false, CANCELLED: true },
  RESOLVED: { CLOSED: true, REOPENED: true },
  CLOSED: {},
  REOPENED: { IN_PROGRESS: false, CANCELLED: true },
  CANCELLED: {},
};

class ConflictError extends Error {}

function isStaff(req: Request) {
  return Boolean(req.auth && staffRoles.has(req.auth.user.role as "IT_STAFF" | "ADMIN"));
}

const staffAccess: RequestHandler = (req, res, next) => {
  if (!req.auth) return apiError(res, 401, "UNAUTHENTICATED", "Authentication is required");
  if (!isStaff(req)) return apiError(res, 403, "FORBIDDEN", "Only IT Staff or Administrators may access this resource");
  return next();
};

function responseTicket(res: Response, ticketId: number) {
  return getPrisma().ticket.findUnique({ where: { id: ticketId }, include: ticketInclude })
    .then((ticket) => ticket ? res.status(200).json({ data: ticketMetadata(ticket, true) }) : notFound(res));
}

function staffTicketSummary(ticket: {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  itPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: StaffStatus;
  requester: Parameters<typeof safeUser>[0];
  owner: Parameters<typeof safeUser>[0] | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    summary: ticket.summary,
    requestedPriority: ticket.requestedPriority,
    itPriority: ticket.itPriority,
    currentStatus: ticket.currentStatus,
    requester: safeUser(ticket.requester),
    owner: ticket.owner ? safeUser(ticket.owner) : null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

const queueQueryFields = new Set(["q", "status", "itPriority", "assigneeId", "categoryId", "sortBy", "sortDir", "page", "pageSize"]);
const queueSortFields = new Set(["ticketNumber", "createdAt", "updatedAt", "status", "itPriority"] as const);

function queueQuery(req: Request) {
  const query = req.query;
  if (Object.entries(query).some(([key, value]) => !queueQueryFields.has(key) || Array.isArray(value))) return { error: "Unknown or repeated queue query parameter" } as const;
  const value = (name: string) => typeof query[name] === "string" ? query[name] as string : undefined;
  const q = value("q")?.trim();
  const status = value("status");
  const itPriority = value("itPriority");
  const assigneeValue = value("assigneeId");
  const categoryValue = value("categoryId");
  const sortBy = value("sortBy") ?? "updatedAt";
  const sortDir = value("sortDir") ?? "desc";
  const pageValue = value("page") ?? "1";
  const pageSizeValue = value("pageSize") ?? "20";
  const page = Number(pageValue);
  const pageSize = Number(pageSizeValue);
  const assigneeId = assigneeValue === undefined ? undefined : Number(assigneeValue);
  const categoryId = categoryValue === undefined ? undefined : Number(categoryValue);
  const invalid =
    (status !== undefined && !statuses.includes(status as StaffStatus)) ||
    (itPriority !== undefined && !priorities.has(itPriority as never)) ||
    (assigneeId !== undefined && (!Number.isInteger(assigneeId) || assigneeId < 1)) ||
    (categoryId !== undefined && (!Number.isInteger(categoryId) || categoryId < 1)) ||
    !queueSortFields.has(sortBy as never) || !["asc", "desc"].includes(sortDir) ||
    !Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100;
  if (invalid) return { error: "Invalid queue query parameters" } as const;
  return { q, status: status as StaffStatus | undefined, itPriority: itPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined, assigneeId, categoryId, sortBy, sortDir: sortDir as "asc" | "desc", page, pageSize } as const;
}

export function createStaffRouter() {
  const router = Router();
  router.use(requireAuth(), staffAccess);

  router.get("/tickets", async (req, res) => {
    const parsed = queueQuery(req);
    if ("error" in parsed) return validationError(res, { query: (parsed as { error: string }).error });
    try {
      const where: Prisma.TicketWhereInput = {
        ...(parsed.status ? { currentStatus: parsed.status } : {}),
        ...(parsed.itPriority ? { itPriority: parsed.itPriority } : {}),
        ...(parsed.assigneeId !== undefined ? { ownerId: parsed.assigneeId } : {}),
        ...(parsed.categoryId !== undefined ? { categoryId: parsed.categoryId } : {}),
        ...(parsed.q ? { OR: [
          { ticketNumber: { contains: parsed.q, mode: "insensitive" } },
          { summary: { contains: parsed.q, mode: "insensitive" } },
          { category: { name: { contains: parsed.q, mode: "insensitive" } } },
          { requester: { displayName: { contains: parsed.q, mode: "insensitive" } } },
          { requester: { email: { contains: parsed.q, mode: "insensitive" } } },
        ] } : {}),
      };
      const orderField = parsed.sortBy === "status" ? "currentStatus" : parsed.sortBy;
      const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
        { [orderField]: parsed.sortDir } as Prisma.TicketOrderByWithRelationInput,
        { id: "asc" },
      ];
      const [total, tickets] = await getPrisma().$transaction([
        getPrisma().ticket.count({ where }),
        getPrisma().ticket.findMany({
          where,
          orderBy,
          skip: (parsed.page - 1) * parsed.pageSize,
          take: parsed.pageSize,
          select: {
            id: true, ticketNumber: true, summary: true, requestedPriority: true, itPriority: true,
            currentStatus: true, createdAt: true, updatedAt: true,
            requester: { select: userSelect }, owner: { select: userSelect },
          },
        }),
      ]);
      return res.status(200).json({ data: {
        items: tickets.map(staffTicketSummary),
        meta: { page: parsed.page, pageSize: parsed.pageSize, total, totalPages: Math.ceil(total / parsed.pageSize), sortBy: parsed.sortBy, sortDir: parsed.sortDir },
      } });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to load the staff ticket queue");
    }
  });

  router.get("/tickets/:id", async (req, res) => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) return notFound(res);
    return responseTicket(res, ticketId).catch(() => apiError(res, 500, "INTERNAL_ERROR", "Unable to load ticket details"));
  });

  router.post("/tickets/:id/claim", requireCsrf, async (req, res) => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) return notFound(res);
    try {
      await getPrisma().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
        const ticket = await tx.ticket.findUnique({ where: { id: ticketId }, select: { ownerId: true } });
        if (!ticket) throw new Error("NOT_FOUND");
        if (ticket.ownerId !== null) throw new ConflictError("Ticket is already assigned");
        await tx.ticket.update({ where: { id: ticketId }, data: { ownerId: req.auth!.user.id } });
      });
      return responseTicket(res, ticketId).catch(() => apiError(res, 500, "INTERNAL_ERROR", "Unable to load ticket details"));
    } catch (error) {
      if (error instanceof ConflictError) return apiError(res, 409, "CONFLICT", error.message);
      if (error instanceof Error && error.message === "NOT_FOUND") return notFound(res);
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to claim ticket");
    }
  });

  router.patch("/tickets/:id/assignment", requireCsrf, async (req, res) => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) return notFound(res);
    const assigneeId = req.body?.assigneeId;
    if (assigneeId !== null && (!Number.isInteger(assigneeId) || assigneeId < 1)) return validationError(res, { assigneeId: "Assignee must be a valid user ID or null" });
    try {
      const prisma = getPrisma();
      if (assigneeId !== null) {
        const assignee = await prisma.user.findUnique({ where: { id: assigneeId }, select: { active: true, role: true } });
        if (!assignee || !assignee.active || !staffRoles.has(assignee.role as "IT_STAFF" | "ADMIN")) return apiError(res, 409, "CONFLICT", "Ticket owner must be an active IT Staff or Administrator");
      }
      const updated = await prisma.ticket.updateMany({ where: { id: ticketId }, data: { ownerId: assigneeId } });
      if (!updated.count) return notFound(res);
      return responseTicket(res, ticketId).catch(() => apiError(res, 500, "INTERNAL_ERROR", "Unable to load ticket details"));
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to update ticket assignment");
    }
  });

  router.patch("/tickets/:id/priority", requireCsrf, async (req, res) => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) return notFound(res);
    const itPriority = req.body?.itPriority;
    if (typeof itPriority !== "string" || !priorities.has(itPriority as never)) return validationError(res, { itPriority: "IT Priority must be LOW, MEDIUM, HIGH, or URGENT" });
    try {
      const updated = await getPrisma().ticket.updateMany({ where: { id: ticketId }, data: { itPriority: itPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" } });
      if (!updated.count) return notFound(res);
      return responseTicket(res, ticketId).catch(() => apiError(res, 500, "INTERNAL_ERROR", "Unable to load ticket details"));
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to update IT Priority");
    }
  });

  router.patch("/tickets/:id/status", requireCsrf, async (req, res) => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) return notFound(res);
    const nextStatus = req.body?.status;
    const confirm = req.body?.confirm;
    if (typeof nextStatus !== "string" || !statuses.includes(nextStatus as StaffStatus)) return validationError(res, { status: "Status is invalid" });
    if (confirm !== undefined && typeof confirm !== "boolean") return validationError(res, { confirm: "Confirm must be a boolean when provided" });
    try {
      await getPrisma().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
        const ticket = await tx.ticket.findUnique({ where: { id: ticketId }, select: { currentStatus: true } });
        if (!ticket) throw new Error("NOT_FOUND");
        const requiredConfirmation = transitionRules[ticket.currentStatus as StaffStatus][nextStatus as StaffStatus];
        if (requiredConfirmation === undefined) throw new ConflictError("This status transition is not allowed");
        if (requiredConfirmation && confirm !== true) throw new ConflictError("Confirmation is required for this status transition");
        await tx.ticket.update({ where: { id: ticketId }, data: { currentStatus: nextStatus as StaffStatus } });
      });
      return responseTicket(res, ticketId).catch(() => apiError(res, 500, "INTERNAL_ERROR", "Unable to load ticket details"));
    } catch (error) {
      if (error instanceof ConflictError) return apiError(res, 409, "CONFLICT", error.message);
      if (error instanceof Error && error.message === "NOT_FOUND") return notFound(res);
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to update ticket status");
    }
  });

  return router;
}

function staffCommunicationAccess(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.user.role === "REQUESTER") return next();
  if (!isStaff(req)) return apiError(res, 403, "FORBIDDEN", "Only IT Staff or Administrators may access this resource");
  return next();
}

const staffMutation: RequestHandler = (req, res, next) => {
  if (req.auth?.user.role === "REQUESTER") return next();
  return requireCsrf(req, res, next);
};

export function createStaffCommunicationRouter() {
  const router = Router();
  router.use(requireAuth());

  router.get("/:id", staffCommunicationAccess, async (req, res, next) => {
    if (req.auth?.user.role === "REQUESTER") return next();
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) return notFound(res);
    return responseTicket(res, ticketId).catch(() => apiError(res, 500, "INTERNAL_ERROR", "Unable to load ticket details"));
  });

  router.get("/:id/comments", staffCommunicationAccess, async (req, res, next) => {
    if (req.auth?.user.role === "REQUESTER") return next();
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) return notFound(res);
    try {
      const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
      if (!ticket) return notFound(res);
      const comments = await getPrisma().publicComment.findMany({ where: { ticketId }, orderBy: { createdAt: "asc" }, include: { author: { select: userSelect } } });
      return res.status(200).json({ data: comments.map(publicCommentMetadata) });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to load comments");
    }
  });

  router.post("/:id/comments", staffCommunicationAccess, staffMutation, async (req, res, next) => {
    if (req.auth?.user.role === "REQUESTER") return next();
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) return notFound(res);
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (body.length < 1 || body.length > 2_000) return validationError(res, { body: "Comment must be 1-2000 characters" });
    try {
      const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
      if (!ticket) return notFound(res);
      const comment = await getPrisma().publicComment.create({ data: { ticketId, authorId: req.auth!.user.id, body }, include: { author: { select: userSelect } } });
      return res.status(201).json({ data: publicCommentMetadata(comment) });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to add comment");
    }
  });

  router.get("/:id/notes", staffCommunicationAccess, async (req, res, next) => {
    if (req.auth?.user.role === "REQUESTER") return next();
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) return notFound(res);
    try {
      const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
      if (!ticket) return notFound(res);
      const notes = await getPrisma().internalNote.findMany({ where: { ticketId }, orderBy: { createdAt: "asc" }, include: { author: { select: userSelect } } });
      return res.status(200).json({ data: notes.map(internalNoteMetadata) });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to load internal notes");
    }
  });

  router.post("/:id/notes", staffCommunicationAccess, staffMutation, async (req, res, next) => {
    if (req.auth?.user.role === "REQUESTER") return next();
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) return notFound(res);
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (body.length < 1 || body.length > 2_000) return validationError(res, { body: "Note must be 1-2000 characters" });
    try {
      const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
      if (!ticket) return notFound(res);
      const note = await getPrisma().internalNote.create({ data: { ticketId, authorId: req.auth!.user.id, body }, include: { author: { select: userSelect } } });
      return res.status(201).json({ data: internalNoteMetadata(note) });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to add internal note");
    }
  });

  return router;
}
