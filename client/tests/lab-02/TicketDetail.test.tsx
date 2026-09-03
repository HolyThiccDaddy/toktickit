import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TicketDetail from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";

const requester: api.Requester = { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com", department: "HR", isActive: true };
const detail: api.TicketDetail = {
  id: 101, ticketNumber: "TKT-2026-000101", summary: "VPN access fails", description: "The VPN client reports an error when connecting from home.", requestedPriority: "HIGH", currentStatus: "NEW", createdAt: "2026-08-22T08:00:00.000Z",
  requester: { id: 1, name: requester.name, email: requester.email }, category: { id: 4, name: "Network" }, relatedSystem: { id: 3, name: "VPN" },
  attachments: [
    { id: 1, originalFilename: "evidence.pdf", fileSize: 2048, mimeType: "application/pdf", isDeleted: false, deletionReason: null, deletedAt: null, createdAt: "2026-08-22T08:01:00.000Z" },
    { id: 2, originalFilename: "old.png", fileSize: 1024, mimeType: "image/png", isDeleted: true, deletionReason: "Duplicate file", deletedAt: "2026-08-23T08:00:00.000Z", createdAt: "2026-08-22T08:02:00.000Z" },
  ],
};

describe("Ticket Detail", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("renders read-only ticket data and active/removed attachment states", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(detail);
    render(<TicketDetail requester={requester} ticketId={101} onBack={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "TKT-2026-000101" })).toBeInTheDocument();
    expect(screen.getByText("VPN access fails")).toBeInTheDocument();
    expect(screen.getByText("The VPN client reports an error when connecting from home.")).toBeInTheDocument();
    expect(screen.getByText("evidence.pdf")).toBeInTheDocument();
    expect(screen.getByText("old.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download unavailable/i })).toBeDisabled();
    expect(screen.queryByRole("textbox", { name: /summary|description/i })).not.toBeInTheDocument();
  });

  it("shows a retryable loading failure", async () => {
    const getTicket = vi.spyOn(api, "getTicket").mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(detail);
    render(<TicketDetail requester={requester} ticketId={101} onBack={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("offline");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("VPN access fails")).toBeInTheDocument();
    expect(getTicket).toHaveBeenCalledTimes(2);
  });

  it("uploads a valid attachment and refreshes the detail", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(detail);
    const add = vi.spyOn(api, "addAttachment").mockResolvedValue(detail.attachments[0]);
    render(<TicketDetail requester={requester} ticketId={101} onBack={vi.fn()} />);
    await screen.findByText("VPN access fails");
    const file = new File(["%PDF-1.4"], "new.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Add Attachment"), { target: { files: [file] } });
    await waitFor(() => expect(add).toHaveBeenCalledWith(1, 101, file));
  });

  it("requires a reason and soft-removes an attachment", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(detail);
    const remove = vi.spyOn(api, "removeAttachment").mockResolvedValue(detail.attachments[1]);
    render(<TicketDetail requester={requester} ticketId={101} onBack={vi.fn()} />);
    await screen.findByText("VPN access fails");
    fireEvent.click(screen.getByRole("button", { name: /^Remove$/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
    expect(await screen.findByText(/between 3 and 255/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "No longer needed" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(1, 1, "No longer needed"));
  });
});
