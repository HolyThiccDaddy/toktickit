import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const staff: api.UserSummary = { id: 2, email: "staff@example.test", displayName: "Alex Staff", role: "IT_STAFF", active: true, mustChangePassword: false };

describe("Responsive operations workspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(staff);
    vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTickets").mockResolvedValue({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0, sortBy: "updatedAt", sortDir: "desc" } });
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue({ metrics: [], items: [], meta: { timezone: "UTC", from: "2026-10-01T00:00:00Z", to: "2026-11-01T00:00:00Z" } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("applies successive toolbar searches while the queue is already open", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Ticket Queue" });
    const input = screen.getByRole("searchbox", { name: "Search tickets" });
    for (const query of ["printer", "VPN"]) {
      fireEvent.change(input, { target: { value: query } });
      fireEvent.submit(input.closest("form")!);
      await waitFor(() => expect(api.getStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({ q: query })));
      expect(screen.getByLabelText("Search queue")).toHaveValue(query);
    }
  });

  it("protects closed mobile navigation from focus and restores focus after Escape and navigation", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Ticket Queue" });
    const nav = document.getElementById("ops-workspace-nav")!;
    const menu = screen.getByRole("button", { name: "Open navigation" });
    expect(nav.inert).toBe(true);
    fireEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    expect(nav.inert).toBe(false);
    within(nav).getByRole("button", { name: "Dashboard" }).focus();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(nav.inert).toBe(true);
    expect(menu).toHaveFocus();
    fireEvent.click(menu);
    fireEvent.click(within(nav).getByRole("button", { name: "Dashboard" }));
    await screen.findByRole("heading", { name: "IT Staff Dashboard" });
    expect(nav.inert).toBe(true);
    expect(menu).toHaveFocus();
    fireEvent.click(menu);
    expect(within(nav).getByText("Alex Staff")).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("keeps requester search ownership-scoped and omits staff/admin navigation", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue({ ...staff, role: "REQUESTER" });
    vi.spyOn(api, "getTickets").mockResolvedValue({ items: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } });
    render(<App />);
    await screen.findByRole("button", { name: "Check System" });
    expect(screen.queryByRole("button", { name: "Ticket Queue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "User Management" })).not.toBeInTheDocument();
    const search = screen.getByRole("searchbox", { name: "Search all your tickets" });
    for (const query of ["printer", "VPN"]) {
      fireEvent.change(search, { target: { value: query } });
      fireEvent.submit(search.closest("form")!);
      await waitFor(() => expect(api.getTickets).toHaveBeenLastCalledWith(expect.objectContaining({ search: query })));
      expect(screen.getByLabelText("Search tickets")).toHaveValue(query);
    }
  });
});
