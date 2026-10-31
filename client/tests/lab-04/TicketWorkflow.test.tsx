import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import * as api from "../../src/api.js";

const user: api.UserSummary = { id: 101, email: "alex.staff@example.com", displayName: "Alex Staff", role: "IT_STAFF", active: true, mustChangePassword: false };
const detail: api.TicketDetail = {
  id: 1, ticketNumber: "TKT-2026-000001", summary: "VPN outage", description: "The VPN is unavailable for a department.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "IN_PROGRESS",
  requester: { id: 2, email: "requester@example.com", displayName: "Requester One", role: "REQUESTER", active: true, mustChangePassword: false }, owner: null,
  category: { id: 1, name: "Network", description: null }, relatedSystem: { id: 1, name: "VPN", description: null }, requesterResolutionIndicatedAt: null,
  attachments: [], publicComments: [], internalNotes: [], createdAt: "2026-09-16T08:00:00.000Z", updatedAt: "2026-09-16T09:00:00.000Z",
};
const completedAction: api.ActionTaken = {
  id: 7, ticketId: 1, actionDateTime: "2026-09-16T08:30:00.000Z", description: "Restored the VPN service and verified connectivity.", result: "Requester confirmed the connection works.", state: "COMPLETED",
  assignee: user, performedBy: user, completedAt: "2026-09-16T08:45:00.000Z", completedBy: user, cancelledAt: null, cancelledBy: null,
  followUpRequired: false, followUpNote: null, followUpResolvedAt: null, followUpResolvedBy: null, attachmentNotes: null, createdAt: "2026-09-16T08:30:00.000Z", updatedAt: "2026-09-16T08:45:00.000Z", version: 2, revisionCount: 1,
};

function actions(items: api.ActionTaken[]) {
  return { items, meta: { page: 1, pageSize: items.length, total: items.length, totalPages: items.length ? 1 : 0 } };
}

describe("Ticket workflow resolution gate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getStaffTicket").mockResolvedValue(detail);
    vi.spyOn(api, "getActionAssignees").mockResolvedValue([]);
  });

  it("requires completed Action evidence before resolving", async () => {
    vi.spyOn(api, "getActions").mockResolvedValue(actions([]));
    const update = vi.spyOn(api, "updateStaffStatus").mockResolvedValue({ ...detail, currentStatus: "RESOLVED" });
    render(<StaffTicketDetail user={user} ticketId={detail.id} onBack={vi.fn()} />);

    await screen.findByRole("heading", { name: detail.ticketNumber });
    fireEvent.change(screen.getByLabelText("Move status"), { target: { value: "RESOLVED" } });
    fireEvent.click(screen.getByLabelText("Confirm transition"));
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/completed qualifying Action/i);
    expect(update).not.toHaveBeenCalled();
  });

  it("submits the selected Action and ticket timestamp for resolution", async () => {
    vi.spyOn(api, "getActions").mockResolvedValue(actions([completedAction]));
    const update = vi.spyOn(api, "updateStaffStatus").mockResolvedValue({ ...detail, currentStatus: "RESOLVED" });
    render(<StaffTicketDetail user={user} ticketId={detail.id} onBack={vi.fn()} />);

    await screen.findByRole("heading", { name: detail.ticketNumber });
    fireEvent.change(screen.getByLabelText("Move status"), { target: { value: "RESOLVED" } });
    fireEvent.change(screen.getByLabelText("Resolution Action evidence"), { target: { value: "7" } });
    fireEvent.click(screen.getByLabelText("Confirm transition"));
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(detail.id, "RESOLVED", true, { resolutionActionId: 7, updatedAt: detail.updatedAt }));
  });

  it("keeps resolution blocked while an Action follow-up is outstanding", async () => {
    vi.spyOn(api, "getActions").mockResolvedValue(actions([{ ...completedAction, followUpRequired: true, followUpNote: "Confirm the service remains stable." }]));
    const update = vi.spyOn(api, "updateStaffStatus").mockResolvedValue({ ...detail, currentStatus: "RESOLVED" });
    render(<StaffTicketDetail user={user} ticketId={detail.id} onBack={vi.fn()} />);

    await screen.findByRole("heading", { name: detail.ticketNumber });
    fireEvent.change(screen.getByLabelText("Move status"), { target: { value: "RESOLVED" } });
    fireEvent.change(screen.getByLabelText("Resolution Action evidence"), { target: { value: "7" } });
    fireEvent.click(screen.getByLabelText("Confirm transition"));
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));

    expect((await screen.findAllByRole("alert")).some((element) => /outstanding Action follow-up/i.test(element.textContent ?? ""))).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });
});
