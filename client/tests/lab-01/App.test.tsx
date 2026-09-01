import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  department: "Human Resources",
  isActive: true,
};

async function enterWorkspace() {
  vi.spyOn(api, "getRequesters").mockResolvedValue([requester]);
  render(<App />);
  fireEvent.change(await screen.findByLabelText(/Development Requester/i), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
  await screen.findByRole("button", { name: /Check System/i });
}

describe("Lab 1 App regression inside requester workspace", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the TokTickIT IT Service Desk heading after requester selection", async () => {
    await enterWorkspace();
    expect(screen.getByText(/IT Service Desk/i)).toBeInTheDocument();
  });

  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });
    await enterWorkspace();
    fireEvent.click(screen.getByRole("button", { name: /Check System/i }));
    expect(await screen.findByText(/System Status: Online/i)).toBeInTheDocument();
    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("Unable to connect to TokTickIT API"));
    await enterWorkspace();
    fireEvent.click(screen.getByRole("button", { name: /Check System/i }));
    expect(await screen.findByText(/System Status: Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  });
});
