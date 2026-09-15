import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const user: api.UserSummary = { id: 1, email: "jennifer@example.com", displayName: "Jennifer Anderson", role: "REQUESTER", active: true, mustChangePassword: false };

describe("Lab 3 authenticated requester shell", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows the login screen when there is no valid session", async () => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValue(new api.ApiError("Authentication is required", {}, "UNAUTHENTICATED", 401));
    render(<App />);
    expect(await screen.findByRole("heading", { name: /Sign in to IT Service Desk/i })).toBeInTheDocument();
    expect(screen.queryByText(/Select Development Requester/i)).not.toBeInTheDocument();
  });

  it("signs in and renders the requester workspace from the session user", async () => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValue(new api.ApiError("Authentication is required", {}, "UNAUTHENTICATED", 401));
    vi.spyOn(api, "login").mockResolvedValue({ user, expiresAt: "2026-09-15T20:00:00.000Z" });
    render(<App />);
    await screen.findByRole("heading", { name: /Sign in to IT Service Desk/i });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "RequesterOne!2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "My Tickets" })).toBeInTheDocument();
  });

  it("provides an accessible password visibility toggle", async () => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValue(new api.ApiError("Authentication is required", {}, "UNAUTHENTICATED", 401));
    render(<App />);
    await screen.findByRole("heading", { name: /Sign in to IT Service Desk/i });
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
  });
});
