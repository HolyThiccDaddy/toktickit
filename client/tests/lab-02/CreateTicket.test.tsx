import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateTicket from "../../src/CreateTicket.js";
import * as api from "../../src/api.js";

const user: api.UserSummary = { id: 1, email: "jennifer@example.com", displayName: "Jennifer Anderson", role: "REQUESTER", active: true, mustChangePassword: false };
const references = { categories: [{ id: 1, name: "Hardware" }], relatedSystems: [{ id: 1, name: "Laptop", description: null }] };

async function openForm() {
  vi.spyOn(api, "getReferenceData").mockResolvedValue(references);
  render(<CreateTicket user={user} onCancel={vi.fn()} />);
  await screen.findByRole("heading", { name: "Create Ticket" });
}

describe("Authenticated Create Ticket", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows field-level validation without calling the API", async () => {
    const createSpy = vi.spyOn(api, "createTicket");
    await openForm();
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));
    expect(await screen.findByText(/Summary must be 5-150/i)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("submits under the authenticated user and shows the official ticket number", async () => {
    vi.spyOn(api, "createTicket").mockResolvedValue({ id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop fails", currentStatus: "NEW", createdAt: "2026-09-01T08:30:00.000Z" });
    await openForm();
    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), { target: { value: "Laptop fails" } });
    fireEvent.change(screen.getByLabelText(/^Description/i), { target: { value: "Laptop does not power on." } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));
    expect(await screen.findByText("TKT-2026-000001")).toBeInTheDocument();
    expect(api.createTicket).toHaveBeenCalledWith(expect.any(FormData));
  });

  it("preserves values after an API failure", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("Unable to create ticket"));
    await openForm();
    const summary = screen.getByLabelText(/Ticket Summary/i);
    fireEvent.change(summary, { target: { value: "Laptop fails" } });
    fireEvent.change(screen.getByLabelText(/^Description/i), { target: { value: "Laptop does not power on." } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Unable to create ticket/i);
    expect(summary).toHaveValue("Laptop fails");
  });

  it("rejects invalid attachments before submission", async () => {
    await openForm();
    fireEvent.change(screen.getByLabelText(/Attachments/i), { target: { files: [new File(["bad"], "malware.exe", { type: "application/octet-stream" })] } });
    expect(await screen.findByText(/must be JPG, PNG, WEBP, or PDF/i)).toBeInTheDocument();
  });
});
