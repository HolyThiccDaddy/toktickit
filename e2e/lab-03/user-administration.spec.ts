import { expect, test } from "../playwright.js";
import { e2eAccounts, signInAsAdmin } from "../support/auth.js";

test.describe("Issue #39 Administrator user management", () => {
  test("lists users and supports create, edit, activation, and initial-password reset", async ({ page }) => {
    await signInAsAdmin(page, e2eAccounts.administrator);
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "admin@example.com" })).toBeVisible();

    await page.getByRole("button", { name: "Create user", exact: true }).first().click();
    await page.getByLabel("Email").fill("e2e-admin-created@example.com");
    await page.getByLabel("Display name").fill("E2E Admin Created");
    await page.getByLabel("Role").last().selectOption("IT_STAFF");
    await page.getByLabel("Initial password").fill("E2EAdminInitial!2026");
    await page.getByRole("button", { name: "Create user", exact: true }).last().click();
    await expect(page.getByRole("status")).toContainText("Created E2E Admin Created");
    await expect(page.getByRole("cell", { name: "e2e-admin-created@example.com" })).toBeVisible();

    const card = page.getByRole("row").filter({ hasText: "e2e-admin-created@example.com" });
    await card.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Display name").fill("E2E Admin Updated");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Updated E2E Admin Updated");

    const updatedRow = page.getByRole("row").filter({ hasText: "e2e-admin-created@example.com" });
    await updatedRow.getByRole("button", { name: "Deactivate" }).click();
    await expect(page.getByRole("status")).toContainText("is now inactive");
    await updatedRow.getByRole("button", { name: "Reset password" }).click();
    await page.getByLabel("New initial password").fill("E2EAdminReset!2026");
    await page.locator("form").filter({ has: page.getByLabel("New initial password") }).getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByRole("status")).toContainText("Reset the initial password");
  });
});
