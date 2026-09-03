import { afterEach, describe, expect, it, vi } from "vitest";
import { addAttachment, createTicket, downloadAttachment, getCategories, getTicket, removeAttachment } from "../../src/api.js";

describe("createTicket API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves structured field errors from the API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "Validation failed",
      fieldErrors: { summary: "Summary is invalid" },
    }), { status: 400, headers: { "content-type": "application/json" } })));

    await expect(createTicket(1, new FormData())).rejects.toMatchObject({
      message: "Validation failed",
      fieldErrors: { summary: "Summary is invalid" },
    });
  });

  it("uses a safe fallback when an error response is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("upstream details", { status: 502 })));

    await expect(createTicket(1, new FormData())).rejects.toMatchObject({
      message: "Unable to create ticket",
      fieldErrors: {},
    });
  });

  it("rejects a malformed success response safely", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("created", { status: 201 })));

    await expect(createTicket(1, new FormData())).rejects.toMatchObject({ message: "Unable to create ticket" });
  });
});

describe("getCategories API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads categories without depending on related systems", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { id: 4, name: "Network" },
    ]), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCategories()).resolves.toEqual([{ id: 4, name: "Network" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/categories$/));
  });

  it("rejects when categories cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("offline", { status: 503 })));
    await expect(getCategories()).rejects.toThrow("Unable to load categories");
  });
});

describe("ticket detail API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends requester context for detail and attachment operations", async () => {
    const detail = { id: 7, ticketNumber: "TKT-2026-000007", summary: "A ticket", description: "A sufficiently long description", requestedPriority: "LOW", currentStatus: "NEW", createdAt: "2026-09-03T00:00:00.000Z", requester: { id: 1, name: "A", email: "a@example.com" }, category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Laptop" }, attachments: [] };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(detail), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 8, originalFilename: "a.pdf", fileSize: 4, mimeType: "application/pdf", isDeleted: false, createdAt: "2026-09-03T00:00:00.000Z" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Attachment removed successfully", attachment: { id: 8, isDeleted: true, deletionReason: "obsolete", deletedAt: "2026-09-03T00:00:00.000Z" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getTicket(1, 7)).resolves.toMatchObject({ ticketNumber: detail.ticketNumber });
    await expect(addAttachment(1, 7, new File(["%PDF"], "a.pdf", { type: "application/pdf" }))).resolves.toMatchObject({ id: 8 });
    await expect(removeAttachment(1, 8, "obsolete")).resolves.toMatchObject({ isDeleted: true });
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringMatching(/\/api\/tickets\/7$/), { headers: { "x-requester-id": "1" } });
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.stringMatching(/\/api\/attachments\/8$/), expect.objectContaining({ method: "DELETE", headers: expect.objectContaining({ "x-requester-id": "1" }) }));
  });

  it("returns a blob and safe filename for attachment download", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("pdf", { status: 200, headers: { "content-disposition": 'attachment; filename="evidence.pdf"' } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await downloadAttachment(1, 8);
    expect(result.filename).toBe("evidence.pdf");
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.size).toBe(3);
  });

  it("normalizes Multer single-file limit errors from files to file", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "Validation failed",
      fieldErrors: { files: "Each attachment must be no larger than 5 MB" },
    }), { status: 400, headers: { "content-type": "application/json" } })));
    await expect(addAttachment(1, 7, new File(["pdf"], "large.pdf", { type: "application/pdf" }))).rejects.toMatchObject({
      message: "Validation failed",
      fieldErrors: { file: "Each attachment must be no larger than 5 MB" },
    });
  });
});
