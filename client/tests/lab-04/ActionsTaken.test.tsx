import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ActionsTaken from "../../src/ActionsTaken.js";
import * as api from "../../src/api.js";

const requester: api.UserSummary = { id: 1, email: "jennifer.anderson@example.com", displayName: "Jennifer Anderson", role: "REQUESTER", active: true, mustChangePassword: false };
const staff: api.UserSummary = { id: 2, email: "alex.staff@example.com", displayName: "Alex Staff", role: "IT_STAFF", active: true, mustChangePassword: false };
const action: api.ActionTaken = {
  id: 10,
  ticketId: 1,
  actionDateTime: "2026-10-29T10:30:42.987Z",
  description: "Replaced the failed network adapter",
  result: "The ticket is responding normally",
  state: "COMPLETED",
  assignee: null,
  performedBy: { id: staff.id, displayName: staff.displayName, role: staff.role },
  completedAt: "2026-10-29T11:00:00.000Z",
  completedBy: { id: staff.id, displayName: staff.displayName, role: staff.role },
  cancelledAt: null,
  cancelledBy: null,
  followUpRequired: true,
  followUpNote: "Check again after maintenance",
  followUpResolvedAt: null,
  followUpResolvedBy: null,
  attachmentNotes: "No attachment needed",
  createdAt: "2026-10-29T10:30:00.000Z",
  updatedAt: "2026-10-29T11:00:00.000Z",
  version: 2,
  revisionCount: 1,
};

const emptyActions: api.ActionsResponse = { items: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };

describe("Lab 4 Actions Taken UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getActionAssignees").mockResolvedValue([staff]);
  });

  it("renders a requester read-only history with performer and follow-up details", async () => {
    vi.spyOn(api, "getActions").mockResolvedValue({ items: [action], meta: { page: 1, pageSize: 1, total: 1, totalPages: 1 } });

    render(<ActionsTaken user={requester} ticketId={1} />);

    expect(await screen.findByRole("heading", { name: "Actions Taken" })).toBeInTheDocument();
    expect(screen.getByText("Replaced the failed network adapter")).toBeInTheDocument();
    expect(screen.getByText(/Alex Staff/)).toBeInTheDocument();
    expect(screen.getByText(/IT_STAFF/)).toBeInTheDocument();
    expect(screen.getByText("Follow-up required")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create Action" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Action" })).not.toBeInTheDocument();
  });

  it("validates the staff form and reuses one idempotency key across a recoverable retry", async () => {
    vi.spyOn(api, "getActions").mockResolvedValue(emptyActions);
    const createAction = vi.spyOn(api, "createAction")
      .mockRejectedValueOnce(new api.ApiError("Temporary failure", {}, "INTERNAL_ERROR", 500))
      .mockResolvedValue(action);

    render(<ActionsTaken user={staff} ticketId={1} />);
    expect(await screen.findByRole("heading", { name: "Actions Taken" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create Action" }));

    fireEvent.change(screen.getByLabelText("Action date and time"), { target: { value: "2026-10-29T10:30" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Too short" } });
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "No" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Description must be 10-2000 characters");
    expect(createAction).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Description"), { target: { value: action.description } });
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: action.result } });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    await waitFor(() => expect(createAction).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("alert")).toHaveTextContent("Temporary failure");
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    await waitFor(() => expect(createAction).toHaveBeenCalledTimes(2));
    expect(createAction.mock.calls[1][2]).toBe(createAction.mock.calls[0][2]);
  });

  it("opens a blank create form from an existing action history", async () => {
    vi.spyOn(api, "getActions").mockResolvedValue({ items: [action], meta: { page: 1, pageSize: 1, total: 1, totalPages: 1 } });

    render(<ActionsTaken user={staff} ticketId={1} />);

    expect(await screen.findByText(action.description)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create Action" }));
    expect(screen.getByRole("heading", { name: "Create Action" })).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(screen.getByLabelText("Result")).toHaveValue("");
  });

  it("clears a hidden follow-up note before saving when follow-up is unchecked", async () => {
    vi.spyOn(api, "getActions").mockResolvedValue(emptyActions);
    const createAction = vi.spyOn(api, "createAction").mockResolvedValue(action);

    render(<ActionsTaken user={staff} ticketId={1} />);
    expect(await screen.findByRole("heading", { name: "Actions Taken" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create Action" }));
    fireEvent.change(screen.getByLabelText("Action date and time"), { target: { value: "2026-10-29T10:30" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: action.description } });
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: action.result } });
    fireEvent.click(screen.getByLabelText("Follow-up required"));
    fireEvent.change(screen.getByLabelText("Follow-up note"), { target: { value: "Temporary follow-up" } });
    fireEvent.click(screen.getByLabelText("Follow-up required"));
    expect(screen.queryByLabelText("Follow-up note")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    await waitFor(() => expect(createAction).toHaveBeenCalledTimes(1));
    expect(createAction.mock.calls[0][1]).toEqual(expect.objectContaining({ followUpRequired: false, followUpNote: null }));
  });

  it("supports edit history and follow-up resolution, while reporting stale edits", async () => {
    vi.spyOn(api, "getActions").mockResolvedValue({ items: [action], meta: { page: 1, pageSize: 1, total: 1, totalPages: 1 } });
    const revisions = vi.spyOn(api, "getActionRevisions").mockResolvedValue([{ id: 1, actionId: action.id, version: 1, before: { result: "Old result", description: "Old description", actionDateTime: "2026-10-29T09:12:33.456Z", state: "OPEN", assigneeId: staff.id, followUpRequired: true, followUpNote: "Old follow-up", attachmentNotes: "Old attachment" }, changedBy: { id: staff.id, displayName: staff.displayName, role: staff.role }, changedAt: action.updatedAt }]);
    const resolveFollowUp = vi.spyOn(api, "resolveActionFollowUp").mockResolvedValue({ ...action, followUpResolvedAt: "2026-10-29T11:05:00.000Z", followUpResolvedBy: { id: staff.id, displayName: staff.displayName, role: staff.role }, version: 3 });
    const updateAction = vi.spyOn(api, "updateAction").mockRejectedValue(new api.ApiError("Action was changed by another user; reload before saving", {}, "CONFLICT", 409));

    render(<ActionsTaken user={staff} ticketId={1} />);
    expect(await screen.findByRole("heading", { name: "Actions Taken" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View edit history" }));
    expect(await screen.findByText("Old result")).toBeInTheDocument();
    expect(screen.getByText(/Action date\/time:/)).toBeInTheDocument();
    expect(screen.getByText(/State:/)).toBeInTheDocument();
    expect(screen.getByText(/Assignee:/)).toBeInTheDocument();
    expect(screen.getByText(/Follow-up required:/)).toBeInTheDocument();
    expect(revisions).toHaveBeenCalledWith(1, action.id);
    fireEvent.click(screen.getByRole("button", { name: "Resolve follow-up" }));
    await waitFor(() => expect(resolveFollowUp).toHaveBeenCalledWith(1, action.id, action.version));

    fireEvent.click(screen.getByRole("button", { name: "Edit Action" }));
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "A newer result" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Action was changed by another user");
    expect(screen.getByRole("button", { name: "Reload actions" })).toBeInTheDocument();
    expect(updateAction).toHaveBeenCalledWith(1, action.id, expect.objectContaining({ version: action.version, result: "A newer result", actionDateTime: action.actionDateTime }));
  });

  it("offers retry after a failed history load and keeps accessible live feedback", async () => {
    const getActions = vi.spyOn(api, "getActions")
      .mockRejectedValueOnce(new api.ApiError("Unable to load Actions Taken", {}, "INTERNAL_ERROR", 500))
      .mockResolvedValue(emptyActions);

    render(<ActionsTaken user={requester} ticketId={1} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load Actions Taken");
    fireEvent.click(screen.getByRole("button", { name: "Retry actions" }));
    await waitFor(() => expect(getActions).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("No Actions Taken recorded yet.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("defines responsive action cards and touch-friendly controls", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    expect(styles).toContain(".actions-taken-list");
    expect(styles).toContain(".actions-taken-card");
    expect(styles).toContain("@media (max-width: 767.98px)");
    expect(styles).toContain(".actions-taken-card .btn");
  });
});
