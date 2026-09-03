const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface Requester {
  id: number;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
}

export interface RelatedSystem { id: number; name: string; description: string | null; }
export interface CreatedTicket { id: number; ticketNumber: string; summary: string; currentStatus: "NEW"; requesterId: number; createdAt: string; }
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketSortField = "createdAt" | "ticketNumber" | "summary" | "requestedPriority";
export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: TicketPriority;
  currentStatus: "NEW";
  createdAt: string;
  category: Category;
  relatedSystem: { id: number; name: string };
}
export interface TicketListResponse {
  tickets: TicketListItem[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}
export interface TicketAttachment {
  id: number;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  isDeleted: boolean;
  deletionReason: string | null;
  deletedAt: string | null;
  createdAt: string;
}
export interface TicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: TicketPriority;
  currentStatus: "NEW";
  createdAt: string;
  requester: Pick<Requester, "id" | "name" | "email">;
  category: Category;
  relatedSystem: Pick<RelatedSystem, "id" | "name">;
  attachments: TicketAttachment[];
}
export interface TicketListQuery {
  search?: string;
  categoryId?: number;
  requestedPriority?: TicketPriority;
  currentStatus?: "NEW";
  sortBy: TicketSortField;
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}

export class ApiError extends Error {
  constructor(message: string, public readonly fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readFieldErrors(body: Record<string, unknown>) {
  const fieldErrors = body.fieldErrors && typeof body.fieldErrors === "object"
    ? Object.fromEntries(Object.entries(body.fieldErrors).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
  // Multer reports single-file limits under `files`; the detail UI uses `file`.
  if (!fieldErrors.file && fieldErrors.files) fieldErrors.file = fieldErrors.files;
  return fieldErrors;
}

export async function getReferenceData(): Promise<{ categories: Category[]; relatedSystems: RelatedSystem[] }> {
  const [categoriesResponse, systemsResponse] = await Promise.all([
    fetch(`${API_URL}/api/categories`), fetch(`${API_URL}/api/related-systems`),
  ]);
  if (!categoriesResponse.ok || !systemsResponse.ok) throw new Error("Unable to load ticket reference data");
  return { categories: await categoriesResponse.json(), relatedSystems: await systemsResponse.json() };
}

export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_URL}/api/categories`);
  if (!response.ok) throw new Error("Unable to load categories");
  return response.json();
}

export async function createTicket(requesterId: number, formData: FormData): Promise<CreatedTicket> {
  const response = await fetch(`${API_URL}/api/tickets`, { method: "POST", headers: { "x-requester-id": String(requesterId) }, body: formData });
  const body = await readJson(response);
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : "Unable to create ticket";
    const fieldErrors = body.fieldErrors && typeof body.fieldErrors === "object"
      ? Object.fromEntries(Object.entries(body.fieldErrors).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {};
    throw new ApiError(message, fieldErrors);
  }
  if (typeof body.ticketNumber !== "string" || typeof body.createdAt !== "string") throw new ApiError("Unable to create ticket");
  return body as unknown as CreatedTicket;
}

export async function getTickets(requesterId: number, query: TicketListQuery): Promise<TicketListResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, item]) => {
    if (item !== undefined && item !== "") params.set(key, String(item));
  });
  const response = await fetch(`${API_URL}/api/tickets?${params.toString()}`, {
    headers: { "x-requester-id": String(requesterId) },
  });
  if (!response.ok) throw new Error("Unable to load your tickets");
  return response.json();
}

export async function getTicket(requesterId: number, ticketId: number): Promise<TicketDetail> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}`, { headers: { "x-requester-id": String(requesterId) } });
  const body = await readJson(response);
  if (!response.ok) throw new ApiError(typeof body.error === "string" ? body.error : "Unable to load ticket details");
  return body as unknown as TicketDetail;
}

export async function addAttachment(requesterId: number, ticketId: number, file: File): Promise<TicketAttachment> {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST", headers: { "x-requester-id": String(requesterId) }, body: formData,
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new ApiError(typeof body.error === "string" ? body.error : "Unable to add attachment", readFieldErrors(body));
  }
  return body as unknown as TicketAttachment;
}

export async function downloadAttachment(requesterId: number, attachmentId: number): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, { headers: { "x-requester-id": String(requesterId) } });
  if (!response.ok) {
    const body = await readJson(response);
    throw new ApiError(typeof body.error === "string" ? body.error : "Unable to download attachment");
  }
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "attachment";
  return { blob: await response.blob(), filename };
}

export async function removeAttachment(requesterId: number, attachmentId: number, deletionReason: string): Promise<TicketAttachment> {
  const response = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE", headers: { "x-requester-id": String(requesterId), "content-type": "application/json" },
    body: JSON.stringify({ deletionReason }),
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new ApiError(typeof body.error === "string" ? body.error : "Unable to remove attachment", readFieldErrors(body));
  }
  return body.attachment as TicketAttachment;
}

export async function getRequesters(): Promise<Requester[]> {
  const response = await fetch(`${API_URL}/api/requesters`);
  if (!response.ok) throw new Error("Failed to load requesters");
  return response.json();
}

// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const catRes = await fetch(`${API_URL}/api/categories`);
  if (!catRes.ok) {
    throw new Error("Failed to load categories");
  }
  const categories: Category[] = await catRes.json();

  return { online: true, categories };
}
