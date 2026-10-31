import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffActionsList from "../../src/StaffActionsList.js";
import * as api from "../../src/api.js";

const staff: api.UserSummary = { id: 2, email: "alex.staff@example.com", displayName: "Alex Staff", role: "IT_STAFF", active: true, mustChangePassword: false };

describe("Lab 4 My Actions drill-down", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("loads the dashboard window and opens the related ticket", async () => {
    vi.spyOn(api, "getStaffActions").mockResolvedValue({
      items: [{ id: 7, ticketId: 42, ticketNumber: "TKT-2026-560007", summary: "Email outage", actionDateTime: "2026-10-10T10:00:00.000Z", description: "Investigated the service request.", result: "Service restored.", state: "COMPLETED", performedBy: { id: 2, displayName: "Alex Staff", role: "IT_STAFF" } }],
      meta: { page: 1, pageSize: 50, total: 1, totalPages: 1, from: "2026-10-01T00:00:00.000Z", to: "2026-10-31T00:00:00.000Z", timezone: "UTC" },
    });
    const viewTicket = vi.fn();
    render(<StaffActionsList user={staff} initialHref="/staff/actions?performedBy=me&from=2026-10-01T00%3A00%3A00.000Z&to=2026-10-31T00%3A00%3A00.000Z" onViewTicket={viewTicket} />);
    expect(await screen.findByRole("heading", { name: "My Actions Taken" })).toBeInTheDocument();
    expect(api.getStaffActions).toHaveBeenCalledWith({ from: "2026-10-01T00:00:00.000Z", to: "2026-10-31T00:00:00.000Z" });
    fireEvent.click(screen.getByRole("button", { name: "TKT-2026-560007" }));
    expect(viewTicket).toHaveBeenCalledWith(42);
  });
});

