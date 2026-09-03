import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requester = { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com", department: "HR", isActive: true };
const secondRequester = { id: 2, name: "Marcus Lee", email: "marcus@example.com", department: "Finance", isActive: true };
const tickets: api.TicketListItem[] = [
  { id: 101, ticketNumber: "TKT-2026-000101", summary: "VPN access fails", requestedPriority: "HIGH", currentStatus: "NEW", createdAt: "2026-08-22T08:00:00.000Z", category: { id: 4, name: "Network" }, relatedSystem: { id: 3, name: "VPN" } },
];

async function selectRequester(id = 1) {
  fireEvent.change(await screen.findByLabelText(/Development Requester/i), { target: { value: String(id) } });
  fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
  fireEvent.click(await screen.findByRole("button", { name: "My Tickets" }));
  await screen.findByRole("heading", { name: "My Tickets" });
}

describe("My Tickets", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "getRequesters").mockResolvedValue([requester, secondRequester]);
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 4, name: "Network" }]);
  });

  it("loads requester-owned tickets and renders desktop and mobile views", async () => {
    const listSpy = vi.spyOn(api, "getTickets").mockResolvedValue({ tickets, pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } });
    render(<App />); await selectRequester();
    expect(await screen.findAllByText("TKT-2026-000101")).toHaveLength(2);
    expect(screen.getByRole("table")).toBeInTheDocument();
    const cards = screen.getByTestId("ticket-card-list");
    expect(cards).toBeInTheDocument();
    expect(cards.querySelector(".category-badge")).toHaveTextContent("Network");
    expect(listSpy).toHaveBeenCalledWith(1, expect.objectContaining({ page: 1, limit: 10 }));
  });

  it("opens the read-only Ticket Detail workspace from a ticket row", async () => {
    vi.spyOn(api, "getTickets").mockResolvedValue({ tickets, pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } });
    vi.spyOn(api, "getTicket").mockResolvedValue({
      id: 101, ticketNumber: tickets[0].ticketNumber, summary: tickets[0].summary, description: "The VPN client reports an error when connecting from home.", requestedPriority: "HIGH", currentStatus: "NEW", createdAt: tickets[0].createdAt,
      requester: { id: 1, name: requester.name, email: requester.email }, category: tickets[0].category, relatedSystem: tickets[0].relatedSystem, attachments: [],
    });
    render(<App />); await selectRequester();
    fireEvent.click(screen.getAllByRole("button", { name: /^View$/ })[0]);
    expect(await screen.findByRole("heading", { name: tickets[0].ticketNumber })).toBeInTheDocument();
    expect(screen.getByText("The VPN client reports an error when connecting from home.")).toBeInTheDocument();
  });

  it("sends search, filters, and sorting then clears them", async () => {
    const listSpy = vi.spyOn(api, "getTickets").mockResolvedValue({ tickets, pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } });
    render(<App />); await selectRequester();
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText(/Search tickets/i), { target: { value: "vpn" } });
    await waitFor(() => expect(listSpy).toHaveBeenLastCalledWith(1, expect.objectContaining({ search: "vpn" })));
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText(/^Category$/i), { target: { value: "4" } });
    await waitFor(() => expect(listSpy).toHaveBeenLastCalledWith(1, expect.objectContaining({ categoryId: 4 })));
    await screen.findByRole("table");
    fireEvent.change(screen.getByRole("combobox", { name: "Requested Priority" }), { target: { value: "HIGH" } });
    await waitFor(() => expect(listSpy).toHaveBeenLastCalledWith(1, expect.objectContaining({ requestedPriority: "HIGH" })));
    await screen.findByRole("table");
    fireEvent.change(screen.getByRole("combobox", { name: "Current Status" }), { target: { value: "NEW" } });
    await waitFor(() => expect(listSpy).toHaveBeenLastCalledWith(1, expect.objectContaining({ currentStatus: "NEW" })));
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: /Sort by Summary/i }));
    await waitFor(() => expect(listSpy).toHaveBeenLastCalledWith(1, expect.objectContaining({ search: "vpn", categoryId: 4, requestedPriority: "HIGH", currentStatus: "NEW", sortBy: "summary", sortOrder: "asc" })));
    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /Sort by Summary/i })).toHaveTextContent("↑");
    fireEvent.click(screen.getByRole("button", { name: /Clear Filters/i }));
    expect(screen.getByLabelText(/Search tickets/i)).toHaveValue("");
    await waitFor(() => expect(listSpy).toHaveBeenLastCalledWith(1, expect.objectContaining({ search: undefined, categoryId: undefined, requestedPriority: undefined, currentStatus: undefined })));
    await screen.findByRole("table");
  });

  it("distinguishes an empty account from filtered no results", async () => {
    vi.spyOn(api, "getTickets")
      .mockResolvedValueOnce({ tickets: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } })
      .mockResolvedValue({ tickets: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    const view = render(<App />); await selectRequester();
    expect(await screen.findByText(/You have not submitted any IT support tickets yet/i)).toBeInTheDocument();
    view.unmount(); sessionStorage.clear();
    vi.mocked(api.getTickets).mockReset().mockResolvedValue({ tickets: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    render(<App />); await selectRequester();
    fireEvent.change(screen.getByLabelText(/Search tickets/i), { target: { value: "missing" } });
    expect(await screen.findByText(/No matching tickets found/i)).toBeInTheDocument();
  });

  it("shows loading, retryable failure, and pagination controls", async () => {
    let resolveList!: (value: api.TicketListResponse) => void;
    const listSpy = vi.spyOn(api, "getTickets").mockReturnValueOnce(new Promise((resolve) => { resolveList = resolve; }));
    render(<App />); await selectRequester();
    expect(screen.getByText(/Loading your tickets/i)).toBeInTheDocument();
    expect(screen.getByTestId("ticket-table-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-card-skeleton")).toBeInTheDocument();
    resolveList({ tickets, pagination: { total: 11, page: 1, limit: 10, totalPages: 2 } });
    expect(await screen.findByText(/Page 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 2" })).toBeInTheDocument();
    listSpy.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Unable to load your tickets/i);
    listSpy.mockResolvedValueOnce({ tickets, pagination: { total: 11, page: 2, limit: 10, totalPages: 2 } });
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(await screen.findByText(/Page 2 of 2/i)).toBeInTheDocument();
  });

  it("shows a retryable category loading error without hiding the ticket list", async () => {
    const categorySpy = vi.mocked(api.getCategories)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([{ id: 4, name: "Network" }]);
    vi.spyOn(api, "getTickets").mockResolvedValue({ tickets, pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } });

    render(<App />); await selectRequester();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Unable to load ticket categories/i);
    expect(screen.getByRole("button", { name: /Retry Categories/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Category" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Retry Categories/i }));
    await waitFor(() => expect(categorySpy).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("option", { name: "Network" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Category" })).toBeEnabled();
  });

  it("reloads ownership-scoped tickets after changing requester", async () => {
    const listSpy = vi.spyOn(api, "getTickets").mockImplementation(async (requesterId) => requesterId === 1
      ? { tickets, pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } }
      : { tickets: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } });

    render(<App />); await selectRequester(1);
    expect(await screen.findAllByText("TKT-2026-000101")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Change Requester" }));
    await selectRequester(2);

    expect(await screen.findByText(/You have not submitted any IT support tickets yet/i)).toBeInTheDocument();
    expect(screen.queryByText("TKT-2026-000101")).not.toBeInTheDocument();
    expect(listSpy).toHaveBeenLastCalledWith(2, expect.objectContaining({ page: 1, limit: 10 }));
  });
});
