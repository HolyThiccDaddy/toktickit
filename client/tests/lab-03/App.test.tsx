import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const user: api.UserSummary = { id: 1, email: "jennifer.anderson@example.com", displayName: "Jennifer Anderson", role: "REQUESTER", active: true, mustChangePassword: false };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Lab 3 authenticated session recovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns to Login when a protected ticket request discovers an expired session", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(user);
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/api/categories")) return Promise.resolve(jsonResponse({ data: [{ id: 1, name: "Hardware", description: null }] }));
      if (url.includes("/api/tickets?")) return Promise.resolve(jsonResponse({ error: { code: "UNAUTHENTICATED", message: "Authentication is required" } }, 401));
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await screen.findByRole("button", { name: "My Tickets" });
    fireEvent.click(screen.getByRole("button", { name: "My Tickets" }));

    expect(await screen.findByRole("heading", { name: "Sign in to IT Service Desk" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "My Tickets" })).not.toBeInTheDocument();
  });

  it("keeps the workspace active and offers retry when logout fails", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(user);
    const logout = vi.spyOn(api, "logout").mockRejectedValue(new api.ApiError("Unable to sign out", {}, "INTERNAL_ERROR", 500));

    render(<App />);
    await screen.findByRole("button", { name: "Check System" });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to sign out");
    expect(screen.getByRole("button", { name: "Retry sign out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check System" })).toBeInTheDocument();
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
