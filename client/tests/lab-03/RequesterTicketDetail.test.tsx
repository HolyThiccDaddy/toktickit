import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TicketDetail from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";

const user: api.UserSummary = { id: 1, email: "jennifer.anderson@example.com", displayName: "Jennifer Anderson", role: "REQUESTER", active: true, mustChangePassword: false };
const detail: api.TicketDetail = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  summary: "VPN access fails",
  description: "The VPN client reports an error when connecting from home.",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "NEW",
  requester: user,
  owner: null,
  category: { id: 4, name: "Network", description: null },
  relatedSystem: { id: 3, name: "VPN", description: null },
  requesterResolutionIndicatedAt: null,
  attachments: [],
  publicComments: [],
  createdAt: "2026-09-03T08:00:00.000Z",
  updatedAt: "2026-09-03T08:00:00.000Z",
};

describe("Requester Ticket Detail conversation actions", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("posts an append-only public comment as the authenticated requester", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(detail);
    const addComment = vi.spyOn(api, "addComment").mockResolvedValue({
      id: 9, ticketId: detail.id, author: user, body: "The VPN works again.", createdAt: "2026-09-03T09:00:00.000Z",
    });
    render(<TicketDetail user={user} ticketId={detail.id} onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: detail.ticketNumber });
    fireEvent.change(screen.getByLabelText("Add a public comment"), { target: { value: "The VPN works again." } });
    fireEvent.click(screen.getByRole("button", { name: "Post comment" }));
    await waitFor(() => expect(addComment).toHaveBeenCalledWith(detail.id, "The VPN works again."));
  });

  it("records Problem appears resolved without changing the formal status", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(detail);
    const indicateResolution = vi.spyOn(api, "indicateResolution").mockResolvedValue({ ticketId: detail.id, indicatedAt: "2026-09-03T09:05:00.000Z" });
    render(<TicketDetail user={user} ticketId={detail.id} onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: detail.ticketNumber });
    fireEvent.click(screen.getByRole("button", { name: "Problem appears resolved" }));
    await waitFor(() => expect(indicateResolution).toHaveBeenCalledWith(detail.id));
    expect(screen.getByText("NEW", { selector: ".status-badge" })).toBeInTheDocument();
  });

  it("does not offer the resolution action for a terminal ticket", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue({ ...detail, currentStatus: "CLOSED" });
    const indicateResolution = vi.spyOn(api, "indicateResolution");
    render(<TicketDetail user={user} ticketId={detail.id} onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: detail.ticketNumber });
    const button = screen.getByRole("button", { name: "Problem appears resolved" });
    expect(button).toBeDisabled();
    expect(indicateResolution).not.toHaveBeenCalled();
  });
});
