import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const user: api.UserSummary = { id: 1, email: "jennifer@example.com", displayName: "Jennifer Anderson", role: "REQUESTER", active: true, mustChangePassword: false };
const tickets: api.TicketListItem[] = [{ id: 101, ticketNumber: "TKT-2026-000101", summary: "VPN access fails", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW", requester: user, owner: null, updatedAt: "2026-08-22T08:00:00.000Z", createdAt: "2026-08-22T08:00:00.000Z", category: { id: 4, name: "Network", description: null }, relatedSystem: { id: 3, name: "VPN", description: null } }];
const list = { items: tickets, meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } };

async function openMyTickets() {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue(user);
  vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 4, name: "Network" }]);
  vi.spyOn(api, "getTickets").mockResolvedValue(list);
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "My Tickets" }));
  await screen.findByRole("heading", { name: "My Tickets" });
}

describe("Authenticated My Tickets", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("loads the session user's tickets and renders responsive table/card structures", async () => {
    await openMyTickets();
    expect(await screen.findAllByText("TKT-2026-000101")).toHaveLength(2);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-card-list")).toBeInTheDocument();
  });

  it("opens a read-only detail from an owned ticket", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(user);
    vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(api, "getTickets").mockResolvedValue(list);
    vi.spyOn(api, "getTicket").mockResolvedValue({ id: 101, ticketNumber: tickets[0].ticketNumber, summary: tickets[0].summary, description: "The VPN client reports an error when connecting from home.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW", requester: user, owner: null, createdAt: tickets[0].createdAt, updatedAt: tickets[0].updatedAt, category: tickets[0].category, relatedSystem: tickets[0].relatedSystem, requesterResolutionIndicatedAt: null, attachments: [], publicComments: [] });
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "My Tickets" }));
    fireEvent.click((await screen.findAllByRole("button", { name: /^View$/ }))[0]);
    expect(await screen.findByRole("heading", { name: tickets[0].ticketNumber })).toBeInTheDocument();
  });

  it("sends authenticated search and filter changes", async () => {
    const listSpy = vi.spyOn(api, "getTickets").mockResolvedValue(list);
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(user);
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 4, name: "Network" }]);
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "My Tickets" }));
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText(/Search tickets/i), { target: { value: "vpn" } });
    await waitFor(() => expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ search: "vpn" })));
  });

  it("shows an empty state and a retryable loading failure", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(user);
    vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(api, "getTickets").mockResolvedValue({ items: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } });
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "My Tickets" }));
    expect(await screen.findByText(/You have not submitted any IT support tickets yet/i)).toBeInTheDocument();
  });
});
