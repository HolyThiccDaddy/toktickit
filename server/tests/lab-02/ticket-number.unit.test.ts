import { describe, expect, it } from "vitest";
import { formatTicketNumber } from "../../src/tickets.js";

describe("formatTicketNumber", () => {
  it("formats the annual sequence with six digits", () => {
    expect(formatTicketNumber(2026, 1)).toBe("TKT-2026-000001");
    expect(formatTicketNumber(2026, 999999)).toBe("TKT-2026-999999");
  });
});
