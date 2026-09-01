import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { Router } from "express";
import multer from "multer";
import { getPrisma } from "./prisma.js";

const maxFileSize = 5_242_880;
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 5, fileSize: maxFileSize } });
const priorities = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const allowedTypes: Record<string, string[]> = {
  ".jpg": ["image/jpeg"], ".jpeg": ["image/jpeg"], ".png": ["image/png"],
  ".webp": ["image/webp"], ".pdf": ["application/pdf"],
};

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

export default createTicketsRouter();
