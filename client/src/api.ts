const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type AuthRole = "REQUESTER" | "IT_STAFF" | "ADMIN";
export interface UserSummary {
  id: number;
  email: string;
  displayName: string;
  role: AuthRole;
  active: boolean;
  mustChangePassword: boolean;
}

export interface SessionData { user: UserSummary; expiresAt: string; }
export interface Category { id: number; name: string; description?: string | null; }
export interface RelatedSystem { id: number; name: string; description: string | null; }
export interface SystemStatus { online: boolean; categories: Category[]; }
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketStatus = "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED";
export type TicketSortField = "createdAt" | "updatedAt" | "ticketNumber" | "summary" | "requestedPriority" | "itPriority";

export interface TicketAttachment {
  id: number;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  isDeleted: boolean;
  deletionReason?: string | null;
  deletedAt?: string | null;
  createdAt: string;
}
export interface PublicComment {
  id: number;
  ticketId: number;
  author: UserSummary;
  body: string;
  createdAt: string;
}
export interface InternalNote extends PublicComment {}
export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: TicketPriority;
  itPriority?: TicketPriority;
  currentStatus: TicketStatus;
  requester?: UserSummary;
  owner?: UserSummary | null;
  createdAt: string;
  updatedAt?: string;
  category: Category;
  relatedSystem: RelatedSystem;
}
export interface TicketListResponse {
  items?: TicketListItem[];
  meta?: { page: number; pageSize: number; limit?: number; total: number; totalPages: number; sortBy?: string; sortDir?: "asc" | "desc" };
  // Temporary aliases keep Lab 2 presentation tests readable during migration.
  tickets?: TicketListItem[];
  pagination?: { total: number; page: number; limit: number; totalPages: number };
}
export interface TicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: TicketPriority;
  itPriority?: TicketPriority;
  currentStatus: TicketStatus;
  requester: UserSummary;
  owner?: UserSummary | null;
  createdAt: string;
  updatedAt?: string;
  category: Category;
  relatedSystem: RelatedSystem;
  requesterResolutionIndicatedAt?: string | null;
  attachments: TicketAttachment[];
  publicComments?: PublicComment[];
  internalNotes?: InternalNote[];
}
export interface CreatedTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: TicketStatus;
  requesterId?: number;
  createdAt: string;
  [key: string]: unknown;
}
export interface TicketListQuery {
  search?: string;
  categoryId?: number;
  requestedPriority?: TicketPriority;
  currentStatus?: TicketStatus;
  sortBy: TicketSortField;
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
    public readonly code = "",
    public readonly status = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let csrfToken: string | null = null;

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try { return await response.json() as Record<string, unknown>; } catch { return {}; }
}

function fieldErrorsFrom(body: Record<string, unknown>) {
  const nested = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : body;
  const value = nested.fieldErrors;
  const errors = value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
  if (!errors.file && errors.files) errors.file = errors.files;
  return errors;
}

function errorFrom(body: Record<string, unknown>, fallback: string, status: number) {
  const nested = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : body;
  const message = typeof nested.message === "string" ? nested.message : typeof body.error === "string" ? body.error : fallback;
  const code = typeof nested.code === "string" ? nested.code : "";
  return new ApiError(message, fieldErrorsFrom(body), code, status);
}

async function requestJson<T>(path: string, init: RequestInit = {}, fallback = "Request failed"): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { credentials: "include", ...init });
  const body = await readJson(response);
  if (!response.ok) throw errorFrom(body, fallback, response.status);
  return (body.data ?? body) as T;
}

export async function getCurrentUser(): Promise<UserSummary> {
  return requestJson<UserSummary>("/api/auth/me", {}, "Unable to load current session");
}

export async function login(email: string, password: string): Promise<SessionData> {
  csrfToken = null;
  return requestJson<SessionData>("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  }, "Unable to sign in");
}

export async function getCsrf(): Promise<string> {
  const data = await requestJson<{ csrfToken: string }>("/api/auth/csrf", {}, "Unable to prepare secure request");
  csrfToken = data.csrfToken;
  return csrfToken;
}

async function csrfHeaders() {
  return { "X-CSRF-Token": csrfToken ?? await getCsrf() };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<UserSummary> {
  return requestJson<UserSummary>("/api/auth/change-password", {
    method: "POST", headers: { "content-type": "application/json", ...await csrfHeaders() },
    body: JSON.stringify({ currentPassword, newPassword }),
  }, "Unable to change password");
}

export async function logout() {
  await requestJson<unknown>("/api/auth/logout", { method: "POST", headers: await csrfHeaders() }, "Unable to sign out");
  csrfToken = null;
}

export async function getReferenceData(): Promise<{ categories: Category[]; relatedSystems: RelatedSystem[] }> {
  const [categories, relatedSystems] = await Promise.all([getCategories(), getRelatedSystems()]);
  return { categories, relatedSystems };
}

export async function getCategories(): Promise<Category[]> {
  return requestJson<Category[]>("/api/categories", {}, "Unable to load categories");
}

export async function getRelatedSystems(): Promise<RelatedSystem[]> {
  return requestJson<RelatedSystem[]>("/api/related-systems", {}, "Unable to load related systems");
}

export async function createTicket(formData: FormData): Promise<CreatedTicket> {
  const body = await requestJson<CreatedTicket>("/api/tickets", { method: "POST", headers: await csrfHeaders(), body: formData }, "Unable to create ticket");
  if (!body || typeof body.ticketNumber !== "string" || typeof body.createdAt !== "string") throw new ApiError("Unable to create ticket");
  return body;
}

export async function getTickets(query: TicketListQuery): Promise<TicketListResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, item]) => { if (item !== undefined && item !== "") params.set(key, String(item)); });
  const result = await requestJson<TicketListResponse>(`/api/tickets?${params.toString()}`, {}, "Unable to load your tickets");
  return { ...result, tickets: result.items ?? result.tickets ?? [], pagination: result.pagination ?? { total: result.meta?.total ?? 0, page: result.meta?.page ?? 1, limit: result.meta?.pageSize ?? 10, totalPages: result.meta?.totalPages ?? 0 } };
}

export async function getTicket(ticketId: number): Promise<TicketDetail> {
  return requestJson<TicketDetail>(`/api/tickets/${ticketId}`, {}, "Unable to load ticket details");
}

export async function addAttachment(ticketId: number, file: File): Promise<TicketAttachment> {
  const body = new FormData(); body.set("file", file);
  return requestJson<TicketAttachment>(`/api/tickets/${ticketId}/attachments`, { method: "POST", headers: await csrfHeaders(), body }, "Unable to add attachment");
}

export async function downloadAttachment(attachmentId: number): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, { credentials: "include" });
  if (!response.ok) throw errorFrom(await readJson(response), "Unable to download attachment", response.status);
  const disposition = response.headers.get("content-disposition") ?? "";
  return { blob: await response.blob(), filename: disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "attachment" };
}

export async function removeAttachment(attachmentId: number, deletionReason: string): Promise<TicketAttachment | void> {
  const response = await fetch(`${API_URL}/api/attachments/${attachmentId}`, { method: "DELETE", credentials: "include", headers: { "content-type": "application/json", ...await csrfHeaders() }, body: JSON.stringify({ deletionReason }) });
  if (!response.ok) throw errorFrom(await readJson(response), "Unable to remove attachment", response.status);
  if (response.status === 204) return undefined;
  const body = await readJson(response);
  return (body.data ?? body.attachment ?? body) as TicketAttachment;
}

export async function getComments(ticketId: number): Promise<PublicComment[]> {
  return requestJson<PublicComment[]>(`/api/tickets/${ticketId}/comments`, {}, "Unable to load comments");
}

export async function addComment(ticketId: number, body: string): Promise<PublicComment> {
  return requestJson<PublicComment>(`/api/tickets/${ticketId}/comments`, { method: "POST", headers: { "content-type": "application/json", ...await csrfHeaders() }, body: JSON.stringify({ body }) }, "Unable to add comment");
}

export async function indicateResolution(ticketId: number): Promise<{ ticketId: number; indicatedAt: string }> {
  return requestJson<{ ticketId: number; indicatedAt: string }>(`/api/tickets/${ticketId}/requester-resolution`, { method: "POST", headers: await csrfHeaders() }, "Unable to record resolution indication");
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`, { credentials: "include" });
  if (!healthRes.ok) throw new Error("Unable to connect to TokTickIT API");
  return { online: true, categories: await getCategories() };
}
