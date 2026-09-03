import { defineConfig, devices } from "@playwright/test";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Specs live at the repository root while Playwright is intentionally installed in client/.
// Add the client dependency directory to CommonJS resolution before specs are loaded.
process.env.NODE_PATH = [path.resolve(process.cwd(), "node_modules"), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();

const frontendUrl = "http://127.0.0.1:5173";
const backendUrl = "http://127.0.0.1:3002";
const e2eResultsPath = fileURLToPath(new URL("../artifacts/lab-02/e2e-results.json", import.meta.url));

export default defineConfig({
  testDir: "../e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  globalSetup: "../e2e/global-setup.mjs",
  globalTeardown: "../e2e/global-teardown.mjs",
  reporter: [["list"], ["json", { outputFile: e2eResultsPath }]],
  use: {
    baseURL: frontendUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], baseURL: frontendUrl },
    },
    {
      name: "tablet",
      testMatch: /responsive\.visual\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: frontendUrl, viewport: { width: 768, height: 1024 }, isMobile: false },
    },
    {
      name: "mobile",
      testMatch: /responsive\.visual\.spec\.ts/,
      use: { ...devices["Pixel 5"], baseURL: frontendUrl },
    },
  ],
  metadata: { backendUrl },
});
