import { expect, test } from "../playwright.js";
import { e2eAccounts, signInAs, signInAsAdmin, signInAsStaff } from "../support/auth.js";

test.describe("Issue #55 role-aware dashboard journeys", () => {
  test("requester sees owned metrics and recent ticket links", async ({ page }) => {
    await signInAs(page, e2eAccounts.jennifer);
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Requester Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Open Tickets/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent and attention tickets" })).toBeVisible();
  });

  test("staff and administrator see role-scoped dashboard shells", async ({ page }) => {
    await signInAsStaff(page, e2eAccounts.alexStaff);
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "IT Staff Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: /My Owned Tickets/ })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await signInAsAdmin(page, e2eAccounts.administrator);
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Administrator Dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Account summary" })).toBeVisible();
  });
});
