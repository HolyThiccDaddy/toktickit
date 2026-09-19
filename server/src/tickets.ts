import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { Router, type Request, type RequestHandler } from "express";
import multer from "multer";
import type { Prisma } from "@prisma/client";
import { apiError, requireAuth, requireCsrf } from "./auth.js";
import { getPrisma } from "./prisma.js";

const maxFileSize = 5_242_880;
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 5, fileSize: maxFileSize } });
const priorities = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"] as const);
const terminalStatuses = new Set(["CLOSED", "CANCELLED"] as const);
const allowedTypes: Record<string, string[]> = {
  ".jpg": ["image/jpeg"], ".jpeg": ["image/jpeg"], ".png": ["image/png"],
  ".webp": ["image/webp"], ".pdf": ["application/pdf"],
};

class AttachmentLimitError extends Error {}

export const userSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  active: true,
  mustChangePassword: true,
} as const;

const requesterAccess: RequestHandler = (req, res, next) => {
  if (!req.auth) return apiError(res, 401, "UNAUTHENTICATED", "Authentication is required");
  if (req.auth.user.role !== "REQUESTER") return apiError(res, 403, "FORBIDDEN", "Only Requesters may access this resource");
  return next();
};

function staffRole(req: Request) {
  return req.auth?.user.role === "IT_STAFF" || req.auth?.user.role === "ADMIN";
}

const requesterMutation: RequestHandler = (req, res, next) => requireCsrf(req, res, next);
const requesterOnlyMutation: RequestHandler = (req, res, next) => {
  if (req.auth?.user.role !== "REQUESTER") return apiError(res, 403, "FORBIDDEN", "Only the ticket requester may remove an attachment");
  return requireCsrf(req, res, next);
};

function requesterIdFrom(req: Request) {
  return req.auth?.user.id ?? null;
}

async function requesterIsActive(req: Request, requesterId: number) {
  return Boolean(req.auth && req.auth.user.id === requesterId && req.auth.user.role === "REQUESTER" && req.auth.user.active);
}

export function notFound(res: Parameters<RequestHandler>[1], message = "Ticket not found") {
  return apiError(res, 404, "NOT_FOUND", message);
}

export function attachmentMetadata(attachment: {
  id: number; originalFilename: string; fileSize: number; mimeType: string;
  isDeleted: boolean; createdAt: Date;
}) {
  return {
    id: attachment.id,
    originalFilename: attachment.originalFilename,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
    isDeleted: attachment.isDeleted,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export function attachmentDetailMetadata(attachment: {
  id: number; originalFilename: string; fileSize: number; mimeType: string;
  isDeleted: boolean; deletionReason: string | null; deletedAt: Date | null; createdAt: Date;
}) {
  return {
    ...attachmentMetadata(attachment),
    deletionReason: attachment.deletionReason,
    deletedAt: attachment.deletedAt?.toISOString() ?? null,
  };
}

export function safeUser(user: {
  id: number; email: string; displayName: string; role: "REQUESTER" | "IT_STAFF" | "ADMIN";
  active: boolean; mustChangePassword: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
  };
}

type PublicCommentRecord = {
  id: number;
  ticketId: number;
  body: string;
  createdAt: Date;
  author: { id: number; email: string; displayName: string; role: "REQUESTER" | "IT_STAFF" | "ADMIN"; active: boolean; mustChangePassword: boolean };
};

export function publicCommentMetadata(comment: PublicCommentRecord) {
  return {
    id: comment.id,
    ticketId: comment.ticketId,
    author: safeUser(comment.author),
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

type InternalNoteRecord = PublicCommentRecord;

export function internalNoteMetadata(note: InternalNoteRecord) {
  return publicCommentMetadata(note);
}

export const ticketInclude = {
  requester: { select: userSelect },
  owner: { select: userSelect },
  category: { select: { id: true, name: true, description: true } },
  relatedSystem: { select: { id: true, name: true, description: true } },
  attachments: {
    select: {
      id: true, originalFilename: true, fileSize: true, mimeType: true,
      isDeleted: true, deletionReason: true, deletedAt: true, createdAt: true,
    },
    orderBy: { id: "asc" },
  },
  publicComments: {
    include: { author: { select: userSelect } },
    orderBy: { createdAt: "asc" },
  },
  internalNotes: {
    include: { author: { select: userSelect } },
    orderBy: { createdAt: "asc" },
  },
} as const;

type TicketRecord = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

export function ticketMetadata(ticket: TicketRecord, includeInternalNotes = false) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    summary: ticket.summary,
    description: ticket.description,
    requestedPriority: ticket.requestedPriority,
    itPriority: ticket.itPriority,
    currentStatus: ticket.currentStatus,
    requester: safeUser(ticket.requester),
    owner: ticket.owner ? safeUser(ticket.owner) : null,
    category: ticket.category,
    relatedSystem: ticket.relatedSystem,
    requesterResolutionIndicatedAt: ticket.requesterResolutionIndicatedAt?.toISOString() ?? null,
    attachments: ticket.attachments.map(attachmentDetailMetadata),
    publicComments: ticket.publicComments.map(publicCommentMetadata),
    ...(includeInternalNotes ? { internalNotes: ticket.internalNotes.map(internalNoteMetadata) } : {}),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

async function ownedTicket(ticketId: number, requesterId: number) {
  return getPrisma().ticket.findFirst({ where: { id: ticketId, requesterId }, include: ticketInclude });
}

export function parseTicketId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function validationError(res: Parameters<RequestHandler>[1], fieldErrors: Record<string, string>, message = "Validation failed") {
  return apiError(res, 400, "VALIDATION_ERROR", message, fieldErrors);
}

function hasValidMagic(file: Pick<Express.Multer.File, "buffer" | "mimetype">) {
  const b = file.buffer;
  if (file.mimetype === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (file.mimetype === "image/png") return b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === "image/webp") return b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP";
  if (file.mimetype === "application/pdf") return b.subarray(0, 5).toString() === "%PDF-";
  return false;
}

export function validateAttachment(file: Pick<Express.Multer.File, "buffer" | "mimetype" | "originalname"> & { size?: number }) {
  const extension = extname(file.originalname).toLowerCase();
  return Boolean((file.size === undefined || file.size <= maxFileSize) && allowedTypes[extension]?.includes(file.mimetype) && hasValidMagic(file));
}

export function formatTicketNumber(year: number, sequence: number) {
  return `TKT-${year}-${String(sequence).padStart(6, "0")}`;
}

type TicketsRouterOptions = {
  getUploadRoot?: () => string;
  writeStagedFile?: (path: string, data: Buffer) => Promise<void>;
  moveAttachment?: (source: string, destination: string) => Promise<void>;
};

export function createTicketsRouter(options: TicketsRouterOptions = {}) {
  const router = Router();
  const getUploadRoot = options.getUploadRoot ?? (() => resolve(process.env.TOKTICKIT_UPLOAD_ROOT ?? resolve(process.cwd(), "uploads")));
  const writeStagedFile = options.writeStagedFile ?? (async (path, data) => { await writeFile(path, data, { flag: "wx" }); });
  const moveAttachment = options.moveAttachment ?? rename;

  router.use(requireAuth(), requesterAccess);

  router.get("/", async (req, res) => {
    const requesterId = requesterIdFrom(req);
    if (requesterId === null || !(await requesterIsActive(req, requesterId))) return apiError(res, 403, "FORBIDDEN", "Requester account is inactive or unavailable");

    const value = (name: string) => typeof req.query[name] === "string" ? req.query[name] as string : undefined;
    const search = value("search")?.trim();
    const categoryIdValue = value("categoryId");
    const requestedPriority = value("requestedPriority");
    const currentStatus = value("currentStatus");
    const sortBy = value("sortBy") ?? "createdAt";
    const sortOrder = value("sortOrder") ?? "desc";
    const pageValue = value("page") ?? "1";
    const limitValue = value("limit") ?? "10";
    const categoryId = categoryIdValue === undefined ? undefined : Number(categoryIdValue);
    const page = Number(pageValue);
    const limit = Number(limitValue);
    const allowedSortFields = new Set(["createdAt", "updatedAt", "ticketNumber", "summary", "requestedPriority", "itPriority"]);
    const validStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
    const invalid =
      (categoryId !== undefined && (!Number.isInteger(categoryId) || categoryId < 1)) ||
      (requestedPriority !== undefined && !priorities.has(requestedPriority as never)) ||
      (currentStatus !== undefined && !validStatuses.includes(currentStatus)) ||
      !allowedSortFields.has(sortBy) || !["asc", "desc"].includes(sortOrder) ||
      !Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50;
    if (invalid) return validationError(res, { query: "Invalid ticket query parameters" });

    try {
      const prisma = getPrisma();
      const where: Prisma.TicketWhereInput = {
        requesterId,
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(requestedPriority ? { requestedPriority: requestedPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" } : {}),
        ...(currentStatus ? { currentStatus: currentStatus as never } : {}),
        ...(search ? { OR: [
          { ticketNumber: { contains: search, mode: "insensitive" } },
          { summary: { contains: search, mode: "insensitive" } },
        ] } : {}),
      };
      const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
        { [sortBy]: sortOrder } as Prisma.TicketOrderByWithRelationInput,
        { id: "asc" },
      ];
      const [total, tickets] = await prisma.$transaction([
        prisma.ticket.count({ where }),
        prisma.ticket.findMany({
          where, orderBy, skip: (page - 1) * limit, take: limit,
          include: {
            requester: { select: userSelect },
            owner: { select: userSelect },
            category: { select: { id: true, name: true, description: true } },
            relatedSystem: { select: { id: true, name: true, description: true } },
          },
        }),
      ]);
      const items = tickets.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        summary: ticket.summary,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        currentStatus: ticket.currentStatus,
        requester: safeUser(ticket.requester),
        owner: ticket.owner ? safeUser(ticket.owner) : null,
        category: ticket.category,
        relatedSystem: ticket.relatedSystem,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      }));
      const meta = { page, pageSize: limit, total, totalPages: Math.ceil(total / limit), sortBy, sortDir: sortOrder };
      return res.status(200).json({ data: { items, meta } });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to load tickets");
    }
  });

  router.get("/:id/comments", async (req, res) => {
    const requesterId = requesterIdFrom(req);
    const ticketId = parseTicketId(req.params.id);
    if (requesterId === null || ticketId === null) return notFound(res);
    try {
      const ticket = await getPrisma().ticket.findFirst({ where: { id: ticketId, requesterId }, select: { id: true } });
      if (!ticket) return notFound(res);
      const comments = await getPrisma().publicComment.findMany({ where: { ticketId }, orderBy: { createdAt: "asc" }, include: { author: { select: userSelect } } });
      return res.status(200).json({ data: comments.map(publicCommentMetadata) });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to load comments");
    }
  });

  router.post("/:id/comments", requesterMutation, async (req, res) => {
    const requesterId = requesterIdFrom(req);
    const ticketId = parseTicketId(req.params.id);
    if (requesterId === null || ticketId === null) return notFound(res);
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (body.length < 1 || body.length > 2_000) return validationError(res, { body: "Comment must be 1-2000 characters" });
    try {
      const ticket = await getPrisma().ticket.findFirst({ where: { id: ticketId, requesterId }, select: { id: true } });
      if (!ticket) return notFound(res);
      const comment = await getPrisma().publicComment.create({ data: { ticketId, authorId: requesterId, body }, include: { author: { select: userSelect } } });
      return res.status(201).json({ data: publicCommentMetadata(comment) });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to add comment");
    }
  });

  router.get("/:id/notes", (_req, res) => apiError(res, 403, "FORBIDDEN", "Only IT Staff or Administrators may access internal notes"));
  router.post("/:id/notes", (_req, res) => apiError(res, 403, "FORBIDDEN", "Only IT Staff or Administrators may access internal notes"));

  router.post("/:id/requester-resolution", requesterMutation, async (req, res) => {
    const requesterId = requesterIdFrom(req);
    const ticketId = parseTicketId(req.params.id);
    if (requesterId === null || ticketId === null) return notFound(res);
    try {
      const ticket = await getPrisma().ticket.findFirst({ where: { id: ticketId, requesterId }, select: { id: true, currentStatus: true, requesterResolutionIndicatedAt: true } });
      if (!ticket) return notFound(res);
      if (terminalStatuses.has(ticket.currentStatus as never)) return apiError(res, 409, "CONFLICT", "A terminal ticket cannot be marked as appearing resolved");
      const indicatedAt = ticket.requesterResolutionIndicatedAt ?? new Date();
      if (!ticket.requesterResolutionIndicatedAt) await getPrisma().ticket.update({ where: { id: ticketId }, data: { requesterResolutionIndicatedAt: indicatedAt } });
      return res.status(200).json({ data: { ticketId, indicatedAt: indicatedAt.toISOString() } });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to record resolution indication");
    }
  });

  router.get("/:id", async (req, res) => {
    const requesterId = requesterIdFrom(req);
    const ticketId = parseTicketId(req.params.id);
    if (requesterId === null || ticketId === null) return notFound(res);
    try {
      const ticket = await ownedTicket(ticketId, requesterId);
      if (!ticket) return notFound(res);
      return res.status(200).json({ data: ticketMetadata(ticket) });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to load ticket details");
    }
  });

  router.post("/:id/attachments", requesterMutation, upload.single("file"), async (req, res) => {
    const requesterId = requesterIdFrom(req);
    const ticketId = parseTicketId(req.params.id);
    if (requesterId === null || ticketId === null) return notFound(res);
    const file = req.file;
    const finalPaths: string[] = [];
    let stagingRoot: string | undefined;
    try {
      const prisma = getPrisma();
      if (!(await requesterIsActive(req, requesterId))) return apiError(res, 403, "FORBIDDEN", "Requester account is inactive or unavailable");
      const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, requesterId }, select: { id: true } });
      if (!ticket) return notFound(res);
      if (!file) return validationError(res, { file: "Attachment file is required" });
      if (!validateAttachment(file)) return validationError(res, { file: "Attachment type, extension, or content is invalid" });

      const uploadRoot = getUploadRoot();
      await mkdir(uploadRoot, { recursive: true });
      stagingRoot = await mkdtemp(resolve(uploadRoot, ".staging-"));
      const storageKey = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
      const stagedPath = resolve(stagingRoot, storageKey);
      const finalPath = resolve(uploadRoot, storageKey);
      await writeStagedFile(stagedPath, file.buffer);

      const created = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
        const activeCount = await tx.attachment.count({ where: { ticketId, isDeleted: false } });
        if (activeCount >= 5) throw new AttachmentLimitError();
        await moveAttachment(stagedPath, finalPath);
        finalPaths.push(finalPath);
        const attachment = await tx.attachment.create({
          data: { ticketId, originalFilename: file.originalname, storageKey, mimeType: file.mimetype, fileSize: file.size, uploaderId: requesterId },
          select: { id: true, originalFilename: true, fileSize: true, mimeType: true, isDeleted: true, createdAt: true },
        });
        await rm(stagingRoot!, { recursive: true, force: true });
        stagingRoot = undefined;
        return attachment;
      });
      return res.status(201).json({ data: attachmentMetadata(created) });
    } catch (error) {
      await Promise.allSettled([...finalPaths.map((path) => rm(path, { force: true })), ...(stagingRoot ? [rm(stagingRoot, { recursive: true, force: true })] : [])]);
      if (error instanceof AttachmentLimitError) return validationError(res, { file: "A ticket may have at most 5 active attachments" });
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to add attachment");
    }
  });

  router.post("/", requesterMutation, upload.array("files", 5), async (req, res) => {
    const requesterId = requesterIdFrom(req);
    if (requesterId === null || !(await requesterIsActive(req, requesterId))) return apiError(res, 403, "FORBIDDEN", "Requester account is inactive or unavailable");

    const summary = typeof req.body.summary === "string" ? req.body.summary.trim() : "";
    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    const categoryId = Number(req.body.categoryId);
    const relatedSystemId = Number(req.body.relatedSystemId);
    const requestedPriority = String(req.body.requestedPriority ?? "");
    const errors: Record<string, string> = {};
    if (summary.length < 5 || summary.length > 150) errors.summary = "Summary must be 5-150 characters";
    if (description.length < 10 || description.length > 2_000) errors.description = "Description must be 10-2000 characters";
    if (!Number.isInteger(categoryId) || categoryId < 1) errors.categoryId = "Valid category is required";
    if (!Number.isInteger(relatedSystemId) || relatedSystemId < 1) errors.relatedSystemId = "Valid related system is required";
    if (!priorities.has(requestedPriority as never)) errors.requestedPriority = "Valid requested priority is required";
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.some((file) => !validateAttachment(file))) errors.files = "Attachment type, extension, or content is invalid";
    if (Object.keys(errors).length) return validationError(res, errors);

    const finalPaths: string[] = [];
    let stagingRoot: string | undefined;
    try {
      const prisma = getPrisma();
      const [category, relatedSystem] = await Promise.all([
        prisma.category.findFirst({ where: { id: categoryId, isActive: true }, select: { id: true } }),
        prisma.relatedSystem.findFirst({ where: { id: relatedSystemId, isActive: true }, select: { id: true } }),
      ]);
      if (!category || !relatedSystem) return validationError(res, { referenceData: "Category or related system is invalid" });

      const uploadRoot = getUploadRoot();
      await mkdir(uploadRoot, { recursive: true });
      stagingRoot = await mkdtemp(resolve(uploadRoot, ".staging-"));
      const preparedAttachments: Array<{ file: Express.Multer.File; storageKey: string; stagedPath: string; finalPath: string }> = [];
      for (const file of files) {
        const storageKey = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
        const stagedPath = resolve(stagingRoot, storageKey);
        const finalPath = resolve(uploadRoot, storageKey);
        await writeStagedFile(stagedPath, file.buffer);
        preparedAttachments.push({ file, storageKey, stagedPath, finalPath });
      }

      const createdId = await prisma.$transaction(async (tx) => {
        const year = new Date().getFullYear();
        // INSERT ... ON CONFLICT is race-safe when the first ticket of a year
        // is created concurrently by multiple authenticated requesters.
        await tx.$executeRaw`INSERT INTO "TicketCounter" (year, "lastSequence") VALUES (${year}, 0) ON CONFLICT (year) DO NOTHING`;
        const counter = await tx.ticketCounter.update({ where: { year }, data: { lastSequence: { increment: 1 } } });
        const ticketNumber = formatTicketNumber(year, counter.lastSequence);
        const attachmentData = [];
        for (const { file, storageKey, stagedPath, finalPath } of preparedAttachments) {
          await moveAttachment(stagedPath, finalPath);
          finalPaths.push(finalPath);
          attachmentData.push({ originalFilename: file.originalname, storageKey, mimeType: file.mimetype, fileSize: file.size, uploaderId: requesterId });
        }
        const createdTicket = await tx.ticket.create({
          data: {
            ticketNumber, summary, description,
            requestedPriority: requestedPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
            itPriority: requestedPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
            requesterId, categoryId, relatedSystemId,
            attachments: { create: attachmentData },
          },
          select: { id: true },
        });
        await rm(stagingRoot!, { recursive: true, force: true });
        stagingRoot = undefined;
        return createdTicket.id;
      });
      const ticket = await ownedTicket(createdId, requesterId);
      if (!ticket) return apiError(res, 500, "INTERNAL_ERROR", "Unable to load created ticket");
      return res.status(201).json({ data: ticketMetadata(ticket) });
    } catch {
      await Promise.allSettled([...finalPaths.map((path) => rm(path, { force: true })), ...(stagingRoot ? [rm(stagingRoot, { recursive: true, force: true })] : [])]);
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to create ticket");
    }
  });

  return router;
}

export function createAttachmentsRouter(options: Pick<TicketsRouterOptions, "getUploadRoot"> = {}) {
  const router = Router();
  const getUploadRoot = options.getUploadRoot ?? (() => resolve(process.env.TOKTICKIT_UPLOAD_ROOT ?? resolve(process.cwd(), "uploads")));
  router.use(requireAuth());

  router.get("/:id/download", async (req, res) => {
    const requesterId = requesterIdFrom(req);
    const attachmentId = parseTicketId(req.params.id);
    if (requesterId === null || attachmentId === null) return notFound(res, "Attachment not found");
    try {
      const attachment = await getPrisma().attachment.findUnique({
        where: { id: attachmentId },
        select: { id: true, originalFilename: true, storageKey: true, mimeType: true, isDeleted: true, ticket: { select: { requesterId: true } } },
      });
      if (!attachment || (!staffRole(req) && attachment.ticket.requesterId !== requesterId)) return notFound(res, "Attachment not found");
      if (attachment.isDeleted) return apiError(res, 410, "GONE", "Attachment has been removed");
      const uploadRoot = resolve(getUploadRoot());
      const filePath = resolve(uploadRoot, attachment.storageKey);
      if (!filePath.startsWith(`${uploadRoot}${process.platform === "win32" ? "\\" : "/"}`)) return notFound(res, "Attachment not found");
      const contents = await readFile(filePath);
      const safeFilename = attachment.originalFilename.replace(/[\r\n"]/g, "_");
      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
      return res.status(200).send(contents);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return notFound(res, "Attachment not found");
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to download attachment");
    }
  });

  router.delete("/:id", requesterOnlyMutation, async (req, res) => {
    const requesterId = requesterIdFrom(req);
    const attachmentId = parseTicketId(req.params.id);
    if (requesterId === null || attachmentId === null) return notFound(res, "Attachment not found");
    try {
      const attachment = await getPrisma().attachment.findUnique({ where: { id: attachmentId }, select: { id: true, isDeleted: true, ticket: { select: { requesterId: true } } } });
      if (!attachment || attachment.ticket.requesterId !== requesterId || attachment.isDeleted) return notFound(res, "Attachment not found");
      const reason = typeof req.body?.deletionReason === "string" ? req.body.deletionReason.trim() : "";
      if (reason.length < 3 || reason.length > 255) return validationError(res, { deletionReason: "Deletion reason must be 3-255 characters" });
      await getPrisma().attachment.update({ where: { id: attachmentId }, data: { isDeleted: true, deletionReason: reason, deletedAt: new Date() } });
      return res.status(204).send();
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to remove attachment");
    }
  });

  return router;
}

export default createTicketsRouter();
