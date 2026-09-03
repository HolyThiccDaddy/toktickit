import { defineConfig, devices } from "@playwright/test";

const frontendUrl = "http://127.0.0.1:5173";
const backendUrl = "http://127.0.0.1:3002";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  globalSetup: "./e2e/global-setup.mjs",
  globalTeardown: "./e2e/global-teardown.mjs",
  reporter: [["list"], ["json", { outputFile: "artifacts/lab-02/e2e-results.json" }]],
  use: {
    baseURL: frontendUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "tablet",
      testMatch: /responsive\.visual\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 }, isMobile: false },
    },
    {
      name: "mobile",
      testMatch: /responsive\.visual\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
  ],
});
