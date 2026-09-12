import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { getPrisma } from "./prisma.js";
import ticketsRouter, { createAttachmentsRouter } from "./tickets.js";
import { authRouter, sessionMiddleware } from "./auth.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

const configuredClientOrigin = process.env.CLIENT_ORIGIN?.trim();
const allowedClientOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(configuredClientOrigin ? [configuredClientOrigin] : []),
]);
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedClientOrigins.has(origin)),
  credentials: true,
})); // allow only the configured UI to send the HttpOnly session cookie
app.use(express.json());
// A cookie is the only source of authenticated identity. The middleware is
// intentionally session-aware even while legacy Lab 2 header routes remain
// available until the requester-regression issue removes that compatibility.
app.use(sessionMiddleware);
app.use("/api/auth", authRouter());
app.use("/api/tickets", ticketsRouter);
app.use("/api/attachments", createAttachmentsRouter());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, department: true, isActive: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json(requesters);
  } catch {
    res.status(500).json({ error: "Failed to fetch requesters" });
  }
});

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({ where: { isActive: true }, select: { id: true, name: true, description: true }, orderBy: { name: "asc" } });
    res.status(200).json(systems);
  } catch {
    res.status(500).json({ error: "Failed to fetch related systems" });
  }
});

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Each attachment must be no larger than 5 MB"
      : "A maximum of 5 attachments is allowed";
    return res.status(400).json({ error: "Validation failed", fieldErrors: { files: message } });
  }
  return next(error);
});

export default app;
