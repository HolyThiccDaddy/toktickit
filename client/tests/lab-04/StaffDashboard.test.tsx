import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffDashboard from "../../src/StaffDashboard.js";
import * as api from "../../src/api.js";

const staff: api.UserSummary = { id: 2, email: "alex.staff@example.com", displayName: "Alex Staff", role: "IT_STAFF", active: true, mustChangePassword: false };
const admin: api.UserSummary = { id: 3, email: "admin@example.com", displayName: "Admin", role: "ADMIN", active: true, mustChangePassword: false };
const response: api.DashboardResponse = {
  metrics: [
    { key: "unassignedTickets", label: "Unassigned Tickets", value: 1, href: "/staff/queue?assigneeId=unassigned&statuses=NEW,OPEN" },
    { key: "myOwnedTickets", label: "My Owned Tickets", value: 2, href: "/staff/queue?assigneeId=me&statuses=NEW,OPEN" },
    { key: "inProgressWaiting", label: "In-Progress / Waiting", value: 1, href: "/staff/queue?statuses=IN_PROGRESS,WAITING_FOR_REQUESTER" },
    { key: "recentlyUpdated", label: "Recently Updated (7 days)", value: 3, href: "/staff/queue?updatedFrom=a&updatedTo=b" },
    { key: "myActionsTaken", label: "My Actions Taken (30 days)", value: 1, href: "/staff/actions?performedBy=me" },
  ],
  items: [{ ticketId: 9, ticketNumber: "TKT-2026-560001", summary: "Email outage", status: "IN_PROGRESS", itPriority: "URGENT", owner: staff, updatedAt: "2026-10-04T10:00:00.000Z", href: "/staff/tickets/9" }],
  meta: { timezone: "UTC", from: "2026-10-01T00:00:00.000Z", to: "2026-10-08T00:00:00.000Z" },
};

describe("Lab 4 staff/admin dashboard", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("keeps staff metrics linked to queue predicates and opens ticket details", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(response);
    const openQueue = vi.fn(); const openActions = vi.fn(); const viewTicket = vi.fn();
    render(<StaffDashboard user={staff} onOpenQueue={openQueue} onOpenActions={openActions} onViewTicket={viewTicket} />);
    expect(await screen.findByRole("heading", { name: "IT Staff Dashboard" })).toBeInTheDocument();
    const unassigned = screen.getByRole("link", { name: /Unassigned Tickets/ });
    expect(unassigned).toHaveAttribute("href", expect.stringContaining("assigneeId=unassigned"));
    fireEvent.click(unassigned);
    expect(openQueue).toHaveBeenCalledWith(unassigned.getAttribute("href"));
    const actions = screen.getByRole("link", { name: /My Actions Taken/ });
    fireEvent.click(actions);
    expect(openActions).toHaveBeenCalledWith(actions.getAttribute("href"));
    fireEvent.click(screen.getByRole("link", { name: "TKT-2026-560001" }));
    expect(viewTicket).toHaveBeenCalledWith(9);
  });

  it("shows administrator account summary without exposing credentials", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue({ ...response, accounts: { adminActive: 1, requesterActive: 2 } });
    render(<StaffDashboard user={admin} onOpenQueue={vi.fn()} onOpenActions={vi.fn()} onViewTicket={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Administrator Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account summary" })).toBeInTheDocument();
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument();
  });
});

