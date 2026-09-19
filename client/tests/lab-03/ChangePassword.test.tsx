import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChangePassword from "../../src/ChangePassword.js";
import * as api from "../../src/api.js";

const user: api.UserSummary = { id: 1, email: "jennifer@example.com", displayName: "Jennifer Anderson", role: "REQUESTER", active: true, mustChangePassword: true };

describe("Lab 3 first-login password gate", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("requires matching policy-compliant passwords and clears the gate after success", async () => {
    const updated = { ...user, mustChangePassword: false };
    vi.spyOn(api, "changePassword").mockResolvedValue(updated);
    const onChanged = vi.fn();
    render(<ChangePassword user={user} onChanged={onChanged} onSignOut={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "RequesterOne!2026" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "RequesterNew!2026" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "RequesterNew!2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(updated));
    expect(api.changePassword).toHaveBeenCalledWith("RequesterOne!2026", "RequesterNew!2026");
  });
});
