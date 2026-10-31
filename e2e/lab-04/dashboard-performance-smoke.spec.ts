import { expect, test } from "../playwright.js";
import { e2eAccounts, signInAsStaff } from "../support/auth.js";

test("loads the staff dashboard within the documented smoke budget", async ({ page }) => {
  const startedAt = Date.now();
  await signInAsStaff(page, e2eAccounts.alexStaff);
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.getByRole("heading", { name: "IT Staff Dashboard" })).toBeVisible();
  expect(Date.now() - startedAt).toBeLessThan(10_000);
});
