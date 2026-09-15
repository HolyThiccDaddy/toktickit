import { expect, test } from "../playwright.js";
import { e2eAccounts, signInAs } from "../support/auth.js";

test.describe("Issue #37 requester communication regression", () => {
  test("adds a public comment and records Problem appears resolved without closing the ticket", async ({ page }) => {
    await signInAs(page, e2eAccounts.sarah);
    await page.getByRole("button", { name: "+ Create Ticket" }).click();
    await page.getByLabel("Category").selectOption({ label: "Software" });
    await page.getByLabel("Related System").selectOption({ label: "LEB2 App" });
    await page.getByLabel("Ticket Summary").fill("Requester communication regression");
    await page.getByLabel("Description").fill("Verify public comments and the requester resolution indication.");
    await page.getByLabel("Requested Priority").selectOption("MEDIUM");
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Ticket created successfully" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    const row = page.getByRole("row").filter({ hasText: "Requester communication regression" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "View", exact: true }).click();
    await expect(page.getByRole("heading", { name: /TKT-\d{4}-\d{6}/ })).toBeVisible();

    await page.getByLabel("Add a public comment").fill("Please confirm the fix in the requester portal.");
    await page.getByRole("button", { name: "Post comment" }).click();
    await expect(page.getByText("Please confirm the fix in the requester portal.", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Problem appears resolved" }).click();
    await expect(page.getByText(/Indicated/)).toBeVisible();
    await expect(page.getByText("NEW", { selector: ".status-badge" })).toBeVisible();
  });
});
