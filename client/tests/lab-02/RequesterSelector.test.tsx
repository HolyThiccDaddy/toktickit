import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("Lab 3 replaces the Development Requester selector", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows the authenticated login screen instead of a requester selector", async () => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValue(new api.ApiError("Authentication is required", {}, "UNAUTHENTICATED", 401));
    render(<App />);
    expect(await screen.findByRole("heading", { name: /Sign in to IT Service Desk/i })).toBeInTheDocument();
    expect(screen.queryByText(/Select Development Requester/i)).not.toBeInTheDocument();
  });

  it("does not persist a requester identity in browser storage", async () => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValue(new api.ApiError("Authentication is required", {}, "UNAUTHENTICATED", 401));
    render(<App />);
    await screen.findByRole("heading", { name: /Sign in to IT Service Desk/i });
    expect(sessionStorage.getItem("toktickit.developmentRequester")).toBeNull();
  });
});
