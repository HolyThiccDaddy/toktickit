import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyTickets from "../../src/MyTickets.js";
import * as api from "../../src/api.js";
import type { Requester } from "../../src/api.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

const requester: Requester = { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", department: "Human Resources", isActive: true };

describe("responsive layout rules", () => {
  beforeEach(() => {
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "getTickets").mockResolvedValue({
      tickets: [{ id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop issue", requestedPriority: "HIGH", currentStatus: "NEW", createdAt: "2026-09-03T10:00:00.000Z", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Email" } }],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
  });

  it("defines the mobile table-to-card switch and touch target rule", () => {
    expect(styles).toContain("@media (max-width: 767.98px)");
    expect(styles).toContain(".ticket-table { display: none; }");
    expect(styles).toContain(".ticket-card-list { display: grid; gap: 1rem; }");
    expect(styles).toContain(".my-tickets .btn { min-height: 44px; }");
  });

  it("renders both table and card structures so CSS can switch at mobile width", async () => {
    render(<MyTickets requester={requester} onCreate={vi.fn()} />);
    expect(await screen.findByTestId("ticket-card-list")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /View ticket/ })).toBeInTheDocument();
  });
});
