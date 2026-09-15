import { afterEach, describe, expect, it, vi } from "vitest";
import { addAttachment, createTicket, downloadAttachment, getCategories, getTicket, removeAttachment } from "../../src/api.js";

const csrfResponse = () => new Response(JSON.stringify({ data: { csrfToken: "csrf-token", expiresAt: "2026-09-03T01:00:00.000Z" } }), { status: 200, headers: { "content-type": "application/json" } });

describe("authenticated API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves structured field errors from the API", async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => String(input).endsWith("/auth/csrf")
      ? Promise.resolve(csrfResponse())
      : Promise.resolve(new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Validation failed", fieldErrors: { summary: "Summary is invalid" } } }), { status: 400, headers: { "content-type": "application/json" } })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createTicket(new FormData())).rejects.toMatchObject({
      message: "Validation failed",
      fieldErrors: { summary: "Summary is invalid" },
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });

  it("uses a safe fallback when an error response is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn((input: string | URL | Request) => String(input).endsWith("/auth/csrf")
      ? Promise.resolve(csrfResponse())
      : Promise.resolve(new Response("upstream details", { status: 502 }))));

    await expect(createTicket(new FormData())).rejects.toMatchObject({ message: "Unable to create ticket", fieldErrors: {} });
  });

  it("rejects a malformed success response safely", async () => {
    vi.stubGlobal("fetch", vi.fn((input: string | URL | Request) => String(input).endsWith("/auth/csrf")
      ? Promise.resolve(csrfResponse())
      : Promise.resolve(new Response(JSON.stringify({ data: { id: 1 } }), { status: 201, headers: { "content-type": "application/json" } }))));

    await expect(createTicket(new FormData())).rejects.toMatchObject({ message: "Unable to create ticket" });
  });
});

describe("authenticated reference data", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads categories with browser credentials and no requester header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 4, name: "Network", description: null }] }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCategories()).resolves.toEqual([{ id: 4, name: "Network", description: null }]);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/categories$/), { credentials: "include" });
  });
});

describe("authenticated ticket and attachment API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the session cookie for detail and attachment operations", async () => {
    const detail = { id: 7, ticketNumber: "TKT-2026-000007", summary: "A ticket", description: "A sufficiently long description", requestedPriority: "LOW", itPriority: "LOW", currentStatus: "NEW", createdAt: "2026-09-03T00:00:00.000Z", updatedAt: "2026-09-03T00:00:00.000Z", requester: { id: 1, email: "a@example.com", displayName: "A", role: "REQUESTER", active: true, mustChangePassword: false }, owner: null, category: { id: 1, name: "Hardware", description: null }, relatedSystem: { id: 1, name: "Laptop", description: null }, requesterResolutionIndicatedAt: null, attachments: [], publicComments: [] };
    const attachment = { id: 8, originalFilename: "a.pdf", fileSize: 4, mimeType: "application/pdf", isDeleted: false, createdAt: "2026-09-03T00:00:00.000Z" };
    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/csrf")) return Promise.resolve(csrfResponse());
      if (url.endsWith("/tickets/7")) return Promise.resolve(new Response(JSON.stringify({ data: detail }), { status: 200, headers: { "content-type": "application/json" } }));
      if (url.endsWith("/tickets/7/attachments")) return Promise.resolve(new Response(JSON.stringify({ data: attachment }), { status: 201, headers: { "content-type": "application/json" } }));
      if (url.endsWith("/attachments/8")) return Promise.resolve(new Response(null, { status: 204 }));
      throw new Error(`Unexpected URL ${url} ${(init?.method ?? "GET")}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTicket(7)).resolves.toMatchObject({ ticketNumber: detail.ticketNumber });
    await expect(addAttachment(7, new File(["%PDF"], "a.pdf", { type: "application/pdf" }))).resolves.toMatchObject({ id: 8 });
    await expect(removeAttachment(8, "obsolete")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringMatching(/\/api\/tickets\/7$/), { credentials: "include" });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/attachments\/8$/), expect.objectContaining({ method: "DELETE", credentials: "include", headers: expect.objectContaining({ "X-CSRF-Token": "csrf-token" }) }));
    expect(fetchMock.mock.calls.flat().some((value) => typeof value === "string" && value.toLowerCase().includes("x-requester-id"))).toBe(false);
  });

  it("returns a blob and safe filename for attachment download", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("pdf", { status: 200, headers: { "content-disposition": 'attachment; filename="evidence.pdf"' } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await downloadAttachment(8);
    expect(result.filename).toBe("evidence.pdf");
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.size).toBe(3);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/attachments\/8\/download$/), { credentials: "include" });
  });

  it("normalizes Multer single-file limit errors from files to file", async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => String(input).endsWith("/auth/csrf")
      ? Promise.resolve(csrfResponse())
      : Promise.resolve(new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Validation failed", fieldErrors: { files: "Each attachment must be no larger than 5 MB" } } }), { status: 400, headers: { "content-type": "application/json" } })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(addAttachment(7, new File(["pdf"], "large.pdf", { type: "application/pdf" }))).rejects.toMatchObject({ message: "Validation failed", fieldErrors: { file: "Each attachment must be no larger than 5 MB" } });
  });
});
