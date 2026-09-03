import { afterEach, describe, expect, it, vi } from "vitest";
import { createTicket, getCategories } from "../../src/api.js";

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
