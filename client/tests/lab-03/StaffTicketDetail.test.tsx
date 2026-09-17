import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import * as api from "../../src/api.js";

const user: api.UserSummary = { id: 101, email: "alex.staff@example.com", displayName: "Alex Staff", role: "IT_STAFF", active: true, mustChangePassword: false };
const detail: api.TicketDetail = {
  id: 1, ticketNumber: "TKT-2026-000001", summary: "VPN outage", description: "The VPN is unavailable for a department.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW",
  requester: { id: 2, email: "requester@example.com", displayName: "Requester One", role: "REQUESTER", active: true, mustChangePassword: false }, owner: null,
  category: { id: 1, name: "Network", description: null }, relatedSystem: { id: 1, name: "VPN", description: null }, requesterResolutionIndicatedAt: null,
  attachments: [], publicComments: [], internalNotes: [], createdAt: "2026-09-16T08:00:00.000Z", updatedAt: "2026-09-16T09:00:00.000Z",
};

describe("IT Staff Ticket Detail operations", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("supports claim, priority/status updates, public comments, and internal notes", async () => {
    vi.spyOn(api, "getStaffTicket").mockResolvedValue({ ...detail, attachments: [{ id: 8, originalFilename: "vpn-error.png", fileSize: 1024, mimeType: "image/png", isDeleted: false, createdAt: "2026-09-16T08:30:00.000Z" }] });
    const claimed = vi.spyOn(api, "claimStaffTicket").mockResolvedValue({ ...detail, owner: user });
    const priority = vi.spyOn(api, "updateStaffPriority").mockResolvedValue({ ...detail, itPriority: "URGENT" });
    const status = vi.spyOn(api, "updateStaffStatus").mockResolvedValue({ ...detail, currentStatus: "OPEN" });
    const addComment = vi.spyOn(api, "addComment").mockResolvedValue({ id: 5, ticketId: detail.id, author: user, body: "Working on this.", createdAt: "2026-09-16T10:00:00.000Z" });
    const addNote = vi.spyOn(api, "addInternalNote").mockResolvedValue({ id: 6, ticketId: detail.id, author: user, body: "Private investigation note.", createdAt: "2026-09-16T10:01:00.000Z" });
    const download = vi.spyOn(api, "downloadAttachment").mockResolvedValue({ blob: new Blob(["attachment"]), filename: "vpn-error.png" });
    render(<StaffTicketDetail user={user} ticketId={detail.id} onBack={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: detail.ticketNumber })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() => expect(download).toHaveBeenCalledWith(8));
    fireEvent.click(screen.getByRole("button", { name: "Claim for me" }));
    await waitFor(() => expect(claimed).toHaveBeenCalledWith(detail.id));
    await waitFor(() => expect(screen.getByLabelText("Assignee ID")).toHaveValue(String(user.id)));
    fireEvent.change(screen.getByLabelText("IT Priority"), { target: { value: "URGENT" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(priority).toHaveBeenCalledWith(detail.id, "URGENT"));
    fireEvent.change(screen.getByLabelText("Move status"), { target: { value: "OPEN" } });
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));
    await waitFor(() => expect(status).toHaveBeenCalledWith(detail.id, "OPEN", false));
    fireEvent.change(screen.getByLabelText("Add a public comment"), { target: { value: "Working on this." } });
    fireEvent.click(screen.getByRole("button", { name: "Post public comment" }));
    await waitFor(() => expect(addComment).toHaveBeenCalledWith(detail.id, "Working on this."));
    fireEvent.change(screen.getByLabelText("Add an internal note"), { target: { value: "Private investigation note." } });
    fireEvent.click(screen.getByRole("button", { name: "Add internal note" }));
    await waitFor(() => expect(addNote).toHaveBeenCalledWith(detail.id, "Private investigation note."));
  });
});
