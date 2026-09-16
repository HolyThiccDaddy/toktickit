import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffQueue from "../../src/StaffQueue.js";
import * as api from "../../src/api.js";

const user: api.UserSummary = { id: 101, email: "alex.staff@example.com", displayName: "Alex Staff", role: "IT_STAFF", active: true, mustChangePassword: false };
const item: api.StaffTicketListItem = {
  id: 1, ticketNumber: "TKT-2026-000001", summary: "VPN outage", requestedPriority: "HIGH", itPriority: "URGENT", currentStatus: "OPEN",
  requester: { id: 2, email: "requester@example.com", displayName: "Requester One", role: "REQUESTER", active: true, mustChangePassword: false },
  owner: null, createdAt: "2026-09-16T08:00:00.000Z", updatedAt: "2026-09-16T09:00:00.000Z",
};

describe("IT Staff Ticket Queue", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders searchable/filterable queue results and opens a ticket", async () => {
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Network", description: null }]);
    const getStaffTickets = vi.spyOn(api, "getStaffTickets").mockResolvedValue({ items: [item], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1, sortBy: "updatedAt", sortDir: "desc" } });
    const onView = vi.fn();
    render(<StaffQueue user={user} onView={onView} />);
    expect(await screen.findByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
    expect(screen.getAllByText(item.ticketNumber)).not.toHaveLength(0);
    expect(screen.getByLabelText("Search queue")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("IT Priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Assignee ID")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Results per page")).toBeInTheDocument();
    expect(screen.getByText("1 result · Page 1 of 1")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Results per page"), { target: { value: "50" } });
    await waitFor(() => expect(getStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 50 })));
    fireEvent.click(screen.getAllByRole("button", { name: "Open" })[0]);
    expect(onView).toHaveBeenCalledWith(item.id);
  });

  it("shows a retryable invalid-query error", async () => {
    vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTickets").mockRejectedValue(new api.ApiError("Invalid queue query parameters", { query: "Invalid" }, "VALIDATION_ERROR", 400));
    render(<StaffQueue user={user} onView={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid queue filters");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
