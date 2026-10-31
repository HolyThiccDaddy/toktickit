import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RequesterDashboard from "../../src/RequesterDashboard.js";
import * as api from "../../src/api.js";

const user: api.UserSummary = { id: 1, email: "jennifer.anderson@example.com", displayName: "Jennifer Anderson", role: "REQUESTER", active: true, mustChangePassword: false };
const dashboard: api.DashboardResponse = {
  metrics: [
    { key: "openTickets", label: "Open Tickets", value: 2, href: "/my-tickets?currentStatuses=NEW,OPEN" },
    { key: "waitingForRequester", label: "Waiting for Requester", value: 0, href: "/my-tickets?currentStatus=WAITING_FOR_REQUESTER" },
    { key: "recentlyUpdated", label: "Recently Updated (7 days)", value: 1, href: "/my-tickets?updatedFrom=2026-10-01&updatedTo=2026-10-08" },
    { key: "recentlyResolved", label: "Recently Resolved (7 days)", value: 0, href: "/my-tickets?currentStatuses=RESOLVED,CLOSED" },
  ],
  items: [{ ticketId: 1, ticketNumber: "TKT-2026-550001", summary: "VPN outage", status: "OPEN", itPriority: "HIGH", owner: null, updatedAt: "2026-10-04T10:00:00.000Z", href: "/tickets/1" }],
  meta: { timezone: "UTC", from: "2026-10-01T00:00:00.000Z", to: "2026-10-08T00:00:00.000Z" },
};

describe("Lab 4 requester dashboard", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders metric values, exact drill-down links, and recent ticket detail", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(dashboard);
    const openTickets = vi.fn();
    const viewTicket = vi.fn();
    render(<RequesterDashboard user={user} onOpenTickets={openTickets} onViewTicket={viewTicket} />);
    expect(await screen.findByRole("heading", { name: "Requester Dashboard" })).toBeInTheDocument();
    expect(screen.getByLabelText("Open Tickets: 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Tickets/ })).toHaveAttribute("href", "/my-tickets?currentStatuses=NEW,OPEN");
    fireEvent.click(screen.getByRole("link", { name: /Open Tickets/ }));
    expect(openTickets).toHaveBeenCalledWith("/my-tickets?currentStatuses=NEW,OPEN");
    fireEvent.click(screen.getByRole("link", { name: "TKT-2026-550001" }));
    expect(viewTicket).toHaveBeenCalledWith(1);
  });

  it("keeps an explicit retry state after a dashboard failure", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockRejectedValueOnce(new api.ApiError("Dashboard unavailable", {}, "INTERNAL_ERROR", 500)).mockResolvedValue(dashboard);
    render(<RequesterDashboard user={user} onOpenTickets={vi.fn()} onViewTicket={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry dashboard" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Requester Dashboard" })).toBeInTheDocument());
  });
});
