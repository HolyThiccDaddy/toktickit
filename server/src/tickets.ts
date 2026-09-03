import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { Router, type Request } from "express";
import multer from "multer";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";

const maxFileSize = 5_242_880;
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 5, fileSize: maxFileSize } });
const priorities = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const allowedTypes: Record<string, string[]> = {
  ".jpg": ["image/jpeg"], ".jpeg": ["image/jpeg"], ".png": ["image/png"],
  ".webp": ["image/webp"], ".pdf": ["application/pdf"],
};

class AttachmentLimitError extends Error {}

function requesterIdFrom(req: Request) {
  const value = Number(req.header("x-requester-id"));
  return Number.isInteger(value) && value > 0 ? value : null;
}

function attachmentMetadata(attachment: {
  id: number; originalFilename: string; fileSize: number; mimeType: string;
  isDeleted: boolean; deletionReason: string | null; deletedAt: Date | null; createdAt: Date;
}) {
  return {
    id: attachment.id,
    originalFilename: attachment.originalFilename,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
    isDeleted: attachment.isDeleted,
    deletionReason: attachment.deletionReason,
    deletedAt: attachment.deletedAt,
    createdAt: attachment.createdAt,
  };
}

function createdAttachmentMetadata(attachment: {
  id: number; originalFilename: string; fileSize: number; mimeType: string; isDeleted: boolean; createdAt: Date;
}) {
  return {
    id: attachment.id,
    originalFilename: attachment.originalFilename,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
    isDeleted: attachment.isDeleted,
    createdAt: attachment.createdAt,
  };
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

  router.get("/:id", async (req, res) => {
    const requesterId = requesterIdFrom(req);
    if (requesterId === null) return res.status(401).json({ error: "Requester identity is required" });
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId < 1) return res.status(404).json({ error: "Ticket not found" });

    try {
      const prisma = getPrisma();
      const requester = await prisma.requesterUser.findFirst({ where: { id: requesterId, isActive: true }, select: { id: true } });
      if (!requester) return res.status(403).json({ error: "Requester is invalid or inactive" });
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          id: true, ticketNumber: true, summary: true, description: true,
          requestedPriority: true, currentStatus: true, createdAt: true,
          requester: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          attachments: {
            select: { id: true, originalFilename: true, fileSize: true, mimeType: true, isDeleted: true, deletionReason: true, deletedAt: true, createdAt: true },
            orderBy: { id: "asc" },
          },
        },
      });
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (ticket.requester.id !== requesterId) return res.status(403).json({ error: "You do not have access to this ticket" });
      return res.status(200).json({ ...ticket, attachments: ticket.attachments.map(attachmentMetadata) });
    } catch {
      return res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  router.post("/:id/attachments", upload.single("file"), async (req, res) => {
    const requesterId = requesterIdFrom(req);
    if (requesterId === null) return res.status(401).json({ error: "Requester identity is required" });
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId < 1) return res.status(404).json({ error: "Ticket not found" });
    const file = req.file;

    const finalPaths: string[] = [];
    let stagingRoot: string | undefined;
    try {
      const prisma = getPrisma();
      const requester = await prisma.requesterUser.findFirst({ where: { id: requesterId, isActive: true }, select: { id: true } });
      if (!requester) return res.status(403).json({ error: "Requester is invalid or inactive" });
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, requesterId: true } });
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (ticket.requesterId !== requesterId) return res.status(403).json({ error: "You do not have access to this ticket" });
      if (!file) return res.status(400).json({ error: "Validation failed", fieldErrors: { file: "Attachment file is required" } });
      if (!validateAttachment(file)) return res.status(400).json({ error: "Validation failed", fieldErrors: { file: "Attachment type, extension, or content is invalid" } });

      const uploadRoot = getUploadRoot();
      await mkdir(uploadRoot, { recursive: true });
      stagingRoot = await mkdtemp(resolve(uploadRoot, ".staging-"));
      const storageKey = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
      const stagedPath = resolve(stagingRoot, storageKey);
      const finalPath = resolve(uploadRoot, storageKey);
      await writeStagedFile(stagedPath, file.buffer);

      const created = await prisma.$transaction(async (tx) => {
        // Lock the parent ticket so concurrent uploads cannot both pass the active-count check.
        await tx.$executeRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
        const activeCount = await tx.attachment.count({ where: { ticketId, isDeleted: false } });
        if (activeCount >= 5) throw new AttachmentLimitError();
        await moveAttachment(stagedPath, finalPath);
        finalPaths.push(finalPath);
        const attachment = await tx.attachment.create({
          data: { ticketId, originalFilename: file.originalname, storageKey, mimeType: file.mimetype, fileSize: file.size, uploaderId: requesterId },
          select: { id: true, originalFilename: true, fileSize: true, mimeType: true, isDeleted: true, deletionReason: true, deletedAt: true, createdAt: true },
        });
        await rm(stagingRoot!, { recursive: true, force: true });
        stagingRoot = undefined;
        return attachment;
      });
      return res.status(201).json(createdAttachmentMetadata(created));
    } catch (error) {
      await Promise.allSettled([...finalPaths.map((path) => rm(path, { force: true })), ...(stagingRoot ? [rm(stagingRoot, { recursive: true, force: true })] : [])]);
      if (error instanceof AttachmentLimitError) return res.status(400).json({ error: "Validation failed", fieldErrors: { file: "A ticket may have at most 5 active attachments" } });
      return res.status(500).json({ error: "Failed to add attachment" });
    }
  });

  router.get("/", async (req, res) => {
    const requesterId = Number(req.header("x-requester-id"));
    if (!Number.isInteger(requesterId) || requesterId < 1) {
      return res.status(401).json({ error: "Requester identity is required" });
    }

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
    const allowedSortFields = new Set(["createdAt", "ticketNumber", "summary", "requestedPriority"]);

    const invalid =
      (categoryId !== undefined && (!Number.isInteger(categoryId) || categoryId < 1)) ||
      (requestedPriority !== undefined && !priorities.has(requestedPriority)) ||
      (currentStatus !== undefined && currentStatus !== "NEW") ||
      !allowedSortFields.has(sortBy) || !["asc", "desc"].includes(sortOrder) ||
      !Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50;
    if (invalid) return res.status(400).json({ error: "Invalid ticket query parameters" });

    try {
      const prisma = getPrisma();
      const requester = await prisma.requesterUser.findFirst({
        where: { id: requesterId, isActive: true }, select: { id: true },
      });
      if (!requester) return res.status(403).json({ error: "Requester is invalid or inactive" });

      const where: Prisma.TicketWhereInput = {
        requesterId,
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(requestedPriority ? { requestedPriority: requestedPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" } : {}),
        ...(currentStatus ? { currentStatus: "NEW" } : {}),
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
          select: {
            id: true, ticketNumber: true, summary: true, requestedPriority: true,
            currentStatus: true, createdAt: true,
            category: { select: { id: true, name: true } },
            relatedSystem: { select: { id: true, name: true } },
          },
        }),
      ]);
      return res.status(200).json({
        tickets,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch {
      return res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  router.post("/", upload.array("files", 5), async (req, res) => {
  const requesterId = Number(req.header("x-requester-id"));
  if (!Number.isInteger(requesterId) || requesterId < 1) return res.status(401).json({ error: "Requester identity is required" });

  const summary = typeof req.body.summary === "string" ? req.body.summary.trim() : "";
  const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
  const categoryId = Number(req.body.categoryId);
  const relatedSystemId = Number(req.body.relatedSystemId);
  const requestedPriority = String(req.body.requestedPriority ?? "");
  const errors: Record<string, string> = {};
  if (summary.length < 5 || summary.length > 150) errors.summary = "Summary must be 5-150 characters";
  if (description.length < 10 || description.length > 2000) errors.description = "Description must be 10-2000 characters";
  if (!Number.isInteger(categoryId) || categoryId < 1) errors.categoryId = "Valid category is required";
  if (!Number.isInteger(relatedSystemId) || relatedSystemId < 1) errors.relatedSystemId = "Valid related system is required";
  if (!priorities.has(requestedPriority)) errors.requestedPriority = "Valid requested priority is required";
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.some((file) => !validateAttachment(file))) errors.files = "Attachment type, extension, or content is invalid";
  if (Object.keys(errors).length) return res.status(400).json({ error: "Validation failed", fieldErrors: errors });

  const finalPaths: string[] = [];
  let stagingRoot: string | undefined;
  try {
    const prisma = getPrisma();
    const requester = await prisma.requesterUser.findFirst({ where: { id: requesterId, isActive: true }, select: { id: true } });
    if (!requester) return res.status(403).json({ error: "Requester is invalid or inactive" });
    const [category, relatedSystem] = await Promise.all([
      prisma.category.findFirst({ where: { id: categoryId, isActive: true }, select: { id: true } }),
      prisma.relatedSystem.findFirst({ where: { id: relatedSystemId, isActive: true }, select: { id: true } }),
    ]);
    if (!category || !relatedSystem) return res.status(400).json({ error: "Validation failed", fieldErrors: { referenceData: "Category or related system is invalid" } });

    const uploadRoot = getUploadRoot();
    await mkdir(uploadRoot, { recursive: true });
    stagingRoot = await mkdtemp(resolve(uploadRoot, ".staging-"));
    const preparedAttachments: Array<{
      file: Express.Multer.File;
      storageKey: string;
      stagedPath: string;
      finalPath: string;
    }> = [];
    for (const file of files) {
      const storageKey = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
      const stagedPath = resolve(stagingRoot, storageKey);
      const finalPath = resolve(uploadRoot, storageKey);
      await writeStagedFile(stagedPath, file.buffer);
      preparedAttachments.push({ file, storageKey, stagedPath, finalPath });
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      await tx.ticketCounter.upsert({ where: { year }, update: {}, create: { year, lastSequence: 0 } });
      const counter = await tx.ticketCounter.update({ where: { year }, data: { lastSequence: { increment: 1 } } });
      const ticketNumber = formatTicketNumber(year, counter.lastSequence);
      const attachmentData = [];
      for (const { file, storageKey, stagedPath, finalPath } of preparedAttachments) {
        await moveAttachment(stagedPath, finalPath);
        finalPaths.push(finalPath);
        attachmentData.push({ originalFilename: file.originalname, storageKey, mimeType: file.mimetype, fileSize: file.size, uploaderId: requesterId });
      }
      const createdTicket = await tx.ticket.create({
        data: { ticketNumber, summary, description, requestedPriority: requestedPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT", requesterId, categoryId, relatedSystemId, attachments: { create: attachmentData } },
        include: { attachments: { select: { id: true, originalFilename: true, mimeType: true, fileSize: true, isDeleted: true, createdAt: true } } },
      });
      await rm(stagingRoot!, { recursive: true, force: true });
      stagingRoot = undefined;
      return createdTicket;
    });
    return res.status(201).json(ticket);
  } catch {
    await Promise.allSettled([
      ...finalPaths.map((path) => rm(path, { force: true })),
      ...(stagingRoot ? [rm(stagingRoot, { recursive: true, force: true })] : []),
    ]);
    return res.status(500).json({ error: "Failed to create ticket" });
  }
  });

  return router;
}

export function createAttachmentsRouter(options: Pick<TicketsRouterOptions, "getUploadRoot"> = {}) {
  const router = Router();
  const getUploadRoot = options.getUploadRoot ?? (() => resolve(process.env.TOKTICKIT_UPLOAD_ROOT ?? resolve(process.cwd(), "uploads")));

  router.get("/:id/download", async (req, res) => {
    const requesterId = requesterIdFrom(req);
    if (requesterId === null) return res.status(401).json({ error: "Requester identity is required" });
    const attachmentId = Number(req.params.id);
    if (!Number.isInteger(attachmentId) || attachmentId < 1) return res.status(404).json({ error: "Attachment not found" });
    try {
      const prisma = getPrisma();
      const requester = await prisma.requesterUser.findFirst({ where: { id: requesterId, isActive: true }, select: { id: true } });
      if (!requester) return res.status(403).json({ error: "Requester is invalid or inactive" });
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        select: { id: true, originalFilename: true, storageKey: true, mimeType: true, isDeleted: true, ticket: { select: { requesterId: true } } },
      });
      if (!attachment) return res.status(404).json({ error: "Attachment not found" });
      if (attachment.ticket.requesterId !== requesterId) return res.status(403).json({ error: "You do not have access to this attachment" });
      if (attachment.isDeleted) return res.status(410).json({ error: "Attachment has been removed" });
      const uploadRoot = resolve(getUploadRoot());
      const filePath = resolve(uploadRoot, attachment.storageKey);
      if (!filePath.startsWith(`${uploadRoot}${process.platform === "win32" ? "\\" : "/"}`)) return res.status(404).json({ error: "Attachment not found" });
      const contents = await readFile(filePath);
      const safeFilename = attachment.originalFilename.replace(/[\r\n"]/g, "_");
      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
      return res.status(200).send(contents);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return res.status(404).json({ error: "Attachment not found" });
      return res.status(500).json({ error: "Failed to download attachment" });
    }
  });

  router.delete("/:id", async (req, res) => {
    const requesterId = requesterIdFrom(req);
    if (requesterId === null) return res.status(401).json({ error: "Requester identity is required" });
    const attachmentId = Number(req.params.id);
    if (!Number.isInteger(attachmentId) || attachmentId < 1) return res.status(404).json({ error: "Attachment not found" });
    try {
      const prisma = getPrisma();
      const requester = await prisma.requesterUser.findFirst({ where: { id: requesterId, isActive: true }, select: { id: true } });
      if (!requester) return res.status(403).json({ error: "Requester is invalid or inactive" });
      const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId }, select: { id: true, isDeleted: true, ticket: { select: { requesterId: true } } } });
      if (!attachment) return res.status(404).json({ error: "Attachment not found" });
      if (attachment.ticket.requesterId !== requesterId) return res.status(403).json({ error: "You do not have access to this attachment" });
      if (attachment.isDeleted) return res.status(404).json({ error: "Attachment not found" });
      const reason = typeof req.body?.deletionReason === "string" ? req.body.deletionReason.trim() : "";
      if (reason.length < 3 || reason.length > 255) return res.status(400).json({ error: "Validation failed", fieldErrors: { deletionReason: "Deletion reason must be 3-255 characters" } });
      const deleted = await prisma.attachment.update({
        where: { id: attachmentId },
        data: { isDeleted: true, deletionReason: reason, deletedAt: new Date() },
        select: { id: true, originalFilename: true, fileSize: true, mimeType: true, isDeleted: true, deletionReason: true, deletedAt: true, createdAt: true },
      });
      return res.status(200).json({ message: "Attachment removed successfully", attachment: { id: deleted.id, isDeleted: deleted.isDeleted, deletionReason: deleted.deletionReason, deletedAt: deleted.deletedAt } });
    } catch {
      return res.status(500).json({ error: "Failed to remove attachment" });
    }
  });

  return router;
}

export default createTicketsRouter();
