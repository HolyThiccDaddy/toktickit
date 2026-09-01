import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requesters = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", department: "Human Resources", isActive: true },
  { id: 2, name: "Michael Brown", email: "michael.brown@example.com", department: "Information Technology", isActive: true },
];

describe("Development Requester selection", () => {
  beforeEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });
  it("loads active requesters and persists the selected requester", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue(requesters);
    render(<App />);

    expect(screen.getByText(/Loading development requesters/i)).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText(/Development Requester/i), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change Requester/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("toktickit.developmentRequester")).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: /Change Requester/i }));
    expect(await screen.findByRole("heading", { name: /Select Development Requester/i })).toBeInTheDocument();
  });

  it("rejects a stale stored requester and uses current API data", async () => {
    sessionStorage.setItem("toktickit.developmentRequester", "999");
    vi.spyOn(api, "getRequesters").mockResolvedValue(requesters);
    render(<App />);
    expect(await screen.findByRole("heading", { name: /Select Development Requester/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("toktickit.developmentRequester")).toBeNull();
  });

  it("refreshes a valid stored requester with the latest API data", async () => {
    sessionStorage.setItem("toktickit.developmentRequester", "1");
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      { ...requesters[0], name: "Jennifer Anderson Updated" },
    ]);
    render(<App />);
    expect(await screen.findByText("Jennifer Anderson Updated")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /IT Service Desk/i })).toBeInTheDocument();
  });

  it("shows a retryable safe error", async () => {
    vi.spyOn(api, "getRequesters")
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(requesters);
    render(<App />);
    expect(await screen.findByText(/Unable to load development requesters from server/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry Connection/i }));
    expect(await screen.findByLabelText(/Development Requester/i)).toBeInTheDocument();
  });

  it("shows the required empty state", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByText(/No active development requesters found in database/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue/i })).toBeDisabled();
  });
});
