import { expect, test } from "../playwright.js";
import { e2eAccounts, signInAsAdmin, signOut } from "../support/auth.js";

test.describe("Issue #39 authenticated release journey", () => {
  test("completes first-login password setup and shows the Administrator shell", async ({ page }) => {
    await signInAsAdmin(page, e2eAccounts.administrator);
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await expect(page.getByRole("button", { name: "User Management" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ticket Queue" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("AdminOne!2026");
    await signOut(page);
  });
});
