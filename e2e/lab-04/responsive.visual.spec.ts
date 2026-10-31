import { expect, test } from "../playwright.js";
import { e2eAccounts, signInAs } from "../support/auth.js";

test("dashboard remains readable without page-level horizontal overflow", async ({ page }) => {
  await signInAs(page, e2eAccounts.jennifer);
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Requester Dashboard" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("link", { name: /Open Tickets/ })).toBeVisible();
});
