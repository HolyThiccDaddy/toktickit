import { afterEach, describe, expect, it, vi } from "vitest";
import { createTicket } from "../../src/api.js";

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
