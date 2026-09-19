import { expect, test } from "../playwright.js";
import { e2eAccounts, signInAs, signInAsAdmin, signInAsStaff, signOut } from "../support/auth.js";

test.describe("Issue #39 responsive release evidence", () => {
  test("captures authentication, user management, staff queue, and staff detail", async ({ page }) => {
    const viewport = test.info().project.name;
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign in to IT Service Desk" })).toBeVisible();
    await page.screenshot({ path: `artifacts/lab-03/screenshots/authentication/${viewport}.png`, fullPage: true });

    await signInAsAdmin(page, e2eAccounts.administrator);
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await page.screenshot({ path: `artifacts/lab-03/screenshots/user-management/${viewport}.png`, fullPage: true });

    await signOut(page);
    await signInAs(page, e2eAccounts.sarah);
    await page.getByRole("button", { name: "+ Create Ticket" }).click();
    await page.getByLabel("Category").selectOption({ label: "Network" });
    await page.getByLabel("Related System").selectOption({ label: "VPN" });
    await page.getByLabel("Ticket Summary").fill(`Issue 39 visual ${viewport}`);
    await page.getByLabel("Description").fill("Release evidence ticket for the staff detail view.");
    await page.getByLabel("Requested Priority").selectOption("HIGH");
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Ticket created successfully" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await signOut(page);

    await signInAsStaff(page, e2eAccounts.alexStaff);
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
    await page.screenshot({ path: `artifacts/lab-03/screenshots/staff-queue/${viewport}.png`, fullPage: true });
    await page.getByLabel("Search queue").fill(`Issue 39 visual ${viewport}`);
    if (viewport === "mobile") {
      const card = page.getByTestId("staff-ticket-card-list").getByRole("article").filter({ hasText: `Issue 39 visual ${viewport}` });
      await expect(card).toBeVisible();
      await card.getByRole("button", { name: "Open ticket" }).click();
    } else {
      const row = page.getByRole("row").filter({ hasText: `Issue 39 visual ${viewport}` });
      await expect(row).toBeVisible();
      await row.getByRole("button", { name: "Open", exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: /TKT-\d{4}-\d{6}/ })).toBeVisible();
    await page.screenshot({ path: `artifacts/lab-03/screenshots/staff-ticket-detail/${viewport}.png`, fullPage: true });
  });
});
