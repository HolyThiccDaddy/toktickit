import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserManagement from "../../src/UserManagement.js";
import * as api from "../../src/api.js";

const admin: api.UserSummary = { id: 201, email: "admin@example.com", displayName: "TokTickIT Administrator", role: "ADMIN", active: true, mustChangePassword: false };
const target: api.UserSummary = { id: 301, email: "alex@example.com", displayName: "Alex Example", role: "IT_STAFF", active: true, mustChangePassword: false };

describe("Administrator User Management", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("lists, filters, creates, edits, toggles, and resets users", async () => {
    vi.spyOn(api, "getAdminUsers").mockResolvedValue([target]);
    const create = vi.spyOn(api, "createAdminUser").mockResolvedValue({ ...target, id: 302, email: "new@example.com", displayName: "New User", role: "REQUESTER", mustChangePassword: true });
    const update = vi.spyOn(api, "updateAdminUser").mockResolvedValue({ ...target, displayName: "Updated Alex", active: true });
    const reset = vi.spyOn(api, "resetAdminUserPassword").mockResolvedValue({ userId: target.id, mustChangePassword: true });
    render(<UserManagement user={admin} />);
    expect(await screen.findByRole("heading", { name: "User Management" })).toBeInTheDocument();
    expect(screen.getAllByText(target.email)).not.toHaveLength(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Create user" })[0]);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "New User" } });
    fireEvent.change(screen.getByLabelText("Initial password"), { target: { value: "NewUserInitial!2026" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Create user" })[1]);
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ email: "new@example.com", initialPassword: "NewUserInitial!2026" })));

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Updated Alex" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(target.id, expect.objectContaining({ displayName: "Updated Alex" })));

    fireEvent.click(screen.getAllByRole("button", { name: "Deactivate" })[0]);
    await waitFor(() => expect(update).toHaveBeenCalledWith(target.id, { active: false }));
    fireEvent.click(screen.getAllByRole("button", { name: "Reset password" })[0]);
    fireEvent.change(screen.getByLabelText("New initial password"), { target: { value: "ResetUserInitial!2026" } });
    fireEvent.submit(screen.getByLabelText("New initial password").closest("form")!);
    await waitFor(() => expect(reset).toHaveBeenCalledWith(target.id, "ResetUserInitial!2026"));
  });

  it("shows retryable API failures and empty search results", async () => {
    const load = vi.spyOn(api, "getAdminUsers").mockRejectedValue(new api.ApiError("Unable to load users", {}, "INTERNAL_ERROR", 500));
    render(<UserManagement user={admin} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load users");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });
});
