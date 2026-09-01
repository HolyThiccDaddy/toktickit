import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App shell regression", () => {
  beforeEach(() => sessionStorage.clear());
  it("preserves the TokTickIT application identity", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([]);
    render(<App />);
    expect(screen.getByText("TokTickIT")).toBeInTheDocument();
    expect(await screen.findByText(/No active development requesters found/i)).toBeInTheDocument();
  });
  it("identifies the selector as a testing mechanism", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([]);
    render(<App />);
    expect(screen.getByText(/not a login screen/i)).toBeInTheDocument();
    expect(await screen.findByText(/No active development requesters found/i)).toBeInTheDocument();
  });
});
