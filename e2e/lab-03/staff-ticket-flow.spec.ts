import { expect, test } from "../playwright.js";
import { e2eAccounts, signInAs, signInAsStaff } from "../support/auth.js";

test.describe("Issue #38 IT Staff queue and ticket operations", () => {
  test("opens the shared queue and staff ticket detail with safe communication controls", async ({ page }) => {
    await signInAs(page, e2eAccounts.sarah);
    await page.getByRole("button", { name: "+ Create Ticket" }).click();
    await page.getByLabel("Category").selectOption({ label: "Network" });
    await page.getByLabel("Related System").selectOption({ label: "VPN" });
    await page.getByLabel("Ticket Summary").fill("Staff queue E2E regression");
    await page.getByLabel("Description").fill("Verify that IT Staff can find and open a shared ticket.");
    await page.getByLabel("Requested Priority").selectOption("HIGH");
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Ticket created successfully" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to IT Service Desk" })).toBeVisible();

    await signInAsStaff(page, e2eAccounts.alexStaff);
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
    await page.getByLabel("Search queue").fill("Staff queue E2E regression");
    const row = page.getByRole("row").filter({ hasText: "Staff queue E2E regression" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Open", exact: true }).click();
    await expect(page.getByRole("heading", { name: /TKT-\d{4}-\d{6}/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Internal notes" })).toBeVisible();
    await expect(page.getByLabel("IT Priority")).toBeVisible();
    await expect(page.getByLabel("Move status")).toBeVisible();
  });
});
