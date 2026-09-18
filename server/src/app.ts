import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { getPrisma } from "./prisma.js";
import ticketsRouter, { createAttachmentsRouter } from "./tickets.js";
import { createStaffCommunicationRouter, createStaffRouter } from "./staff.js";
import { createAdminRouter } from "./admin.js";
import { apiError, authRouter, requireAuth, sessionMiddleware } from "./auth.js";

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
// A validated server-side session is the only source of authenticated identity.
// The requester-regression slice removes the temporary Lab 2 header boundary.
app.use(sessionMiddleware);
app.use("/api/auth", authRouter());
app.use("/api/staff", createStaffRouter());
app.use("/api/admin", createAdminRouter());
app.use("/api/tickets", createStaffCommunicationRouter());
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

app.get("/api/categories", requireAuth(), async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json({ data: categories });
  } catch {
    apiError(res, 500, "INTERNAL_ERROR", "Unable to load categories");
  }
});

app.get("/api/related-systems", requireAuth(), async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({ where: { isActive: true }, select: { id: true, name: true, description: true }, orderBy: { name: "asc" } });
    res.status(200).json({ data: systems });
  } catch {
    apiError(res, 500, "INTERNAL_ERROR", "Unable to load related systems");
  }
});

app.use("/api", (_req: Request, res: Response) => apiError(res, 404, "NOT_FOUND", "API resource not found"));

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Each attachment must be no larger than 5 MB"
      : "A maximum of 5 attachments is allowed";
    return apiError(res, 400, "VALIDATION_ERROR", "Validation failed", { files: message });
  }
  if (error && typeof error === "object" && "type" in error && (error as { type?: unknown }).type === "entity.parse.failed") {
    return apiError(res, 400, "VALIDATION_ERROR", "Request body must contain valid JSON");
  }
  return apiError(res, 500, "INTERNAL_ERROR", "Internal server error");
});

export default app;
