import { expect, test } from "../playwright.js";
import { e2eAccounts, signInAsStaff } from "../support/auth.js";

test("loads the staff dashboard within the documented smoke budget", async ({ page }) => {
  await signInAsStaff(page, e2eAccounts.alexStaff);
  const startedAt = Date.now();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.getByRole("heading", { name: "IT Staff Dashboard" })).toBeVisible();
  await expect(page.getByText("Loading staff dashboard...", { exact: true })).toBeHidden();
  const metrics = page.locator('[aria-label="Staff ticket metrics"]');
  await expect(metrics).toBeVisible();
  await expect(metrics.locator("strong").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent and urgent queue items" })).toBeVisible();
  expect(Date.now() - startedAt).toBeLessThan(10_000);
});
