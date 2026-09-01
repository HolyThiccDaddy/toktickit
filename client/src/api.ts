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

export async function getReferenceData(): Promise<{ categories: Category[]; relatedSystems: RelatedSystem[] }> {
  const [categoriesResponse, systemsResponse] = await Promise.all([
    fetch(`${API_URL}/api/categories`), fetch(`${API_URL}/api/related-systems`),
  ]);
  if (!categoriesResponse.ok || !systemsResponse.ok) throw new Error("Unable to load ticket reference data");
  return { categories: await categoriesResponse.json(), relatedSystems: await systemsResponse.json() };
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
