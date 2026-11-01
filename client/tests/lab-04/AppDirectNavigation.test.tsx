import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const staff: api.UserSummary = { id: 2, email: "alex.staff@example.com", displayName: "Alex Staff", role: "IT_STAFF", active: true, mustChangePassword: false };
const ticket: api.TicketDetail = {
  id: 9, ticketNumber: "TKT-2026-560001", summary: "Email outage", description: "Email is unavailable.", requestedPriority: "HIGH", itPriority: "URGENT", currentStatus: "IN_PROGRESS",
  requester: { id: 4, email: "requester@example.com", displayName: "Requester One", role: "REQUESTER", active: true, mustChangePassword: false }, owner: staff,
  category: { id: 1, name: "Network", description: null }, relatedSystem: { id: 1, name: "Mail", description: null }, requesterResolutionIndicatedAt: null,
  attachments: [], publicComments: [], internalNotes: [], createdAt: "2026-10-04T09:00:00.000Z", updatedAt: "2026-10-04T10:00:00.000Z",
};

describe("direct links into authenticated workspaces", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(staff);
  });

  it("opens a staff ticket URL directly after restoring the authenticated session", async () => {
    window.history.replaceState({}, "", "/staff/tickets/9");
    const getTicket = vi.spyOn(api, "getStaffTicket").mockResolvedValue(ticket);
    vi.spyOn(api, "getActions").mockResolvedValue({ items: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } });
    vi.spyOn(api, "getActionAssignees").mockResolvedValue([]);

    render(<App />);

    expect(await screen.findByRole("heading", { name: ticket.ticketNumber })).toBeInTheDocument();
    expect(getTicket).toHaveBeenCalledWith(9);
  });

  it("restores queue filters when a metric URL is opened directly", async () => {
    window.history.replaceState({}, "", "/staff/queue?assigneeId=unassigned&statuses=NEW,OPEN");
    const getCategories = vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Network", description: null }]);
    const getTickets = vi.spyOn(api, "getStaffTickets").mockResolvedValue({
      items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0, sortBy: "updatedAt", sortDir: "desc" },
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Assignee ID")).toHaveValue("unassigned");
    expect(getCategories).toHaveBeenCalled();
    expect(getTickets).toHaveBeenCalledWith(expect.objectContaining({ assigneeId: "unassigned", statuses: ["NEW", "OPEN"] }));
  });

  it("restores the selected date window when an Actions metric URL is opened directly", async () => {
    const from = "2026-10-01T00:00:00.000Z";
    const to = "2026-10-31T00:00:00.000Z";
    window.history.replaceState({}, "", `/staff/actions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&performedBy=me`);
    const getActions = vi.spyOn(api, "getStaffActions").mockResolvedValue({
      items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0, from, to, timezone: "UTC" },
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "My Actions Taken" })).toBeInTheDocument();
    expect(getActions).toHaveBeenCalledWith({ from, to });
  });
});
