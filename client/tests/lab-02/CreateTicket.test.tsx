import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requester = { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com", department: "HR", isActive: true };
async function openForm() {
  vi.spyOn(api, "getRequesters").mockResolvedValue([requester]);
  vi.spyOn(api, "getReferenceData").mockResolvedValue({ categories: [{ id: 1, name: "Hardware" }], relatedSystems: [{ id: 1, name: "Laptop", description: null }] });
  render(<App />);
  fireEvent.change(await screen.findByLabelText(/Development Requester/i), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Create Ticket/i }));
  await screen.findByRole("heading", { name: "Create Ticket" });
}

describe("Create Ticket", () => {
  beforeEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });
  it("shows field-level validation without calling the API", async () => {
    const createSpy = vi.spyOn(api, "createTicket"); await openForm();
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));
    expect(await screen.findByText(/Summary must be 5-150/i)).toBeInTheDocument();
    expect(screen.getByText(/Description must be 10-2000/i)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });
  it("submits under the selected requester and shows the official ticket number", async () => {
    vi.spyOn(api, "createTicket").mockResolvedValue({ id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop fails", currentStatus: "NEW", requesterId: 1 }); await openForm();
    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), { target: { value: "Laptop fails" } });
    fireEvent.change(screen.getByLabelText(/^Description/i), { target: { value: "Laptop does not power on." } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } }); fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));
    expect(await screen.findByText("TKT-2026-000001")).toBeInTheDocument();
    expect(api.createTicket).toHaveBeenCalledWith(1, expect.any(FormData));
  });
  it("preserves entered values after an API failure", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("Unable to create ticket")); await openForm();
    const summary = screen.getByLabelText(/Ticket Summary/i); fireEvent.change(summary, { target: { value: "Laptop fails" } });
    fireEvent.change(screen.getByLabelText(/^Description/i), { target: { value: "Laptop does not power on." } }); fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } }); fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Unable to create ticket/i);
    expect(summary).toHaveValue("Laptop fails");
  });

  it("rejects an invalid attachment before submission", async () => {
    await openForm();
    const file = new File(["bad"], "malware.exe", { type: "application/octet-stream" });
    fireEvent.change(screen.getByLabelText(/Attachments/i), { target: { files: [file] } });
    expect(await screen.findByText(/must be JPG, PNG, WEBP, or PDF/i)).toBeInTheDocument();
  });

  it("rejects an attachment larger than 5 MB before submission", async () => {
    await openForm();
    const file = new File([new Uint8Array(5_242_881)], "large.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/Attachments/i), { target: { files: [file] } });
    expect(await screen.findByText(/no larger than 5 MB/i)).toBeInTheDocument();
  });

  it("removes a selected attachment before submission", async () => {
    vi.spyOn(api, "createTicket").mockResolvedValue({ id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop fails", currentStatus: "NEW", requesterId: 1 });
    await openForm();
    const file = new File(["%PDF-1.4"], "evidence.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/Attachments/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /Remove evidence.pdf/i }));
    expect(screen.queryByText(/evidence.pdf \(/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), { target: { value: "Laptop fails" } });
    fireEvent.change(screen.getByLabelText(/^Description/i), { target: { value: "Laptop does not power on." } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));
    await screen.findByText("TKT-2026-000001");
    const submitted = vi.mocked(api.createTicket).mock.calls[0][1];
    expect(submitted.getAll("files")).toHaveLength(0);
  });

  it("shows backend field validation beside the matching input", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new api.ApiError("Validation failed", { summary: "Summary is already in use" }));
    await openForm();
    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), { target: { value: "Laptop fails" } });
    fireEvent.change(screen.getByLabelText(/^Description/i), { target: { value: "Laptop does not power on." } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));
    expect(await screen.findByText("Summary is already in use")).toBeInTheDocument();
  });

  it("disables duplicate submission while the request is pending", async () => {
    let resolveCreate!: (ticket: api.CreatedTicket) => void;
    vi.spyOn(api, "createTicket").mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    await openForm();
    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), { target: { value: "Laptop fails" } });
    fireEvent.change(screen.getByLabelText(/^Description/i), { target: { value: "Laptop does not power on." } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } }); fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));
    expect(await screen.findByRole("button", { name: /Submitting/i })).toBeDisabled();
    resolveCreate({ id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop fails", currentStatus: "NEW", requesterId: 1 });
    expect(await screen.findByText("TKT-2026-000001")).toBeInTheDocument();
  });
});
