import { expect, test } from "../playwright.js";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { e2eAccounts, signInAsAdmin } from "../support/auth.js";

const evidenceDir = fileURLToPath(new URL("../../artifacts/lab-03/screenshots/user-management/states/", import.meta.url));
async function capture(page: any, name: string) {
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: `${evidenceDir}/${name}.png`, fullPage: true });
}

test.describe("Issue #39 Administrator user management", () => {
  test("lists users and supports create, edit, activation, and initial-password reset", async ({ page }) => {
    await signInAsAdmin(page, e2eAccounts.administrator);
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "admin@example.com" })).toBeVisible();
    await capture(page, "01_user_list");
    await page.getByLabel("Search users").fill("alex.staff@example.com");
    await expect(page.getByRole("cell", { name: "alex.staff@example.com" })).toBeVisible();
    await capture(page, "02_user_search");
    await page.getByLabel("Search users").fill("");
    await page.getByLabel("Role", { exact: true }).first().selectOption("IT_STAFF");
    await expect(page.getByRole("cell", { name: "alex.staff@example.com" })).toBeVisible();
    await capture(page, "03_user_role_filter");
    await page.getByLabel("Role", { exact: true }).first().selectOption("");

    await page.getByRole("button", { name: "Create user", exact: true }).first().click();
    await capture(page, "04_create_form");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Display name").fill("Invalid Evidence User");
    await page.getByLabel("Initial password").fill("short");
    await page.getByRole("button", { name: "Create user", exact: true }).last().click();
    expect(await page.getByLabel("Email").evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false);
    await capture(page, "04_invalid_input_blocked");
    await page.getByLabel("Email").fill("e2e-admin-created@example.com");
    await page.getByLabel("Display name").fill("E2E Admin Created");
    await page.getByLabel("Role").last().selectOption("IT_STAFF");
    await page.getByLabel("Initial password").fill("E2EAdminInitial!2026");
    await capture(page, "05_create_filled");
    await page.getByRole("button", { name: "Create user", exact: true }).last().click();
    await expect(page.getByRole("status")).toContainText("Created E2E Admin Created");
    await expect(page.getByRole("cell", { name: "e2e-admin-created@example.com" })).toBeVisible();
    await capture(page, "06_created_success");

    const card = page.getByRole("row").filter({ hasText: "e2e-admin-created@example.com" });
    await card.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Email").fill("e2e-admin-updated@example.com");
    await page.getByLabel("Display name").fill("E2E Admin Updated");
    await page.getByLabel("Role").last().selectOption("REQUESTER");
    await capture(page, "07_edit_form");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Updated E2E Admin Updated");
    await expect(page.getByRole("row").filter({ hasText: "e2e-admin-updated@example.com" })).toContainText("REQUESTER");
    await capture(page, "08_updated_success");

    const updatedRow = page.getByRole("row").filter({ hasText: "e2e-admin-updated@example.com" });
    await updatedRow.getByRole("button", { name: "Deactivate" }).click();
    await expect(page.getByRole("status")).toContainText("is now inactive");
    await capture(page, "09_deactivated");
    await updatedRow.getByRole("button", { name: "Reset password" }).click();
    await page.getByLabel("New initial password").fill("E2EAdminReset!2026");
    await capture(page, "10_reset_form");
    await page.locator("form").filter({ has: page.getByLabel("New initial password") }).getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByRole("status")).toContainText("Reset the initial password");
    await capture(page, "11_reset_success");

    await page.getByRole("row").filter({ hasText: "admin@example.com" }).getByRole("button", { name: "Deactivate" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await capture(page, "12_self_deactivation_rejected");

    await page.getByRole("button", { name: "Create user", exact: true }).first().click();
    await page.getByLabel("Email").fill("e2e-admin-updated@example.com");
    await page.getByLabel("Display name").fill("Duplicate E2E User");
    await page.getByLabel("Initial password").fill("E2EDuplicate!2026");
    await page.getByRole("button", { name: "Create user", exact: true }).last().click();
    await expect(page.getByRole("alert")).toBeVisible();
    await capture(page, "13_duplicate_email_rejected");

    await page.getByRole("button", { name: "Cancel" }).click();
    await updatedRow.getByRole("button", { name: "Activate" }).click();
    await expect(updatedRow.getByRole("button", { name: "Deactivate" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to IT Service Desk" })).toBeVisible();
    await page.getByLabel("Email").fill("e2e-admin-updated@example.com");
    await page.getByRole("textbox", { name: "Password" }).fill("E2EAdminReset!2026");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /TokTickIT IT Service Desk/ })).not.toBeVisible();
    await capture(page, "14_reset_requires_change_on_next_login");
  });
});
