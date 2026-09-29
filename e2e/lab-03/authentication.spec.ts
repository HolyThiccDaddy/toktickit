import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test } from "../playwright.js";
import { e2eAccounts } from "../support/auth.js";

const evidenceDir = fileURLToPath(new URL("../../artifacts/lab-03/screenshots/authentication/states/", import.meta.url));

test.describe("Issue #39 authenticated release journey", () => {
  test("completes first-login password setup and shows the Administrator shell", async ({ page }) => {
    await mkdir(evidenceDir, { recursive: true });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign in to IT Service Desk" })).toBeVisible();

    await page.getByLabel("Email").fill("not-a-user@example.com");
    await page.getByRole("textbox", { name: "Password" }).fill("WrongPassword!2026");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Invalid email or password");
    await page.locator("main section.card").screenshot({ path: `${evidenceDir}01_invalid_login.png` });

    await page.getByLabel("Email").fill("inactive.staff@example.com");
    await page.getByRole("textbox", { name: "Password" }).fill("StaffFour!2026");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("This account is inactive");
    await page.locator("main section.card").screenshot({ path: `${evidenceDir}02_inactive_account.png` });

    await page.reload();
    await expect(page.getByRole("heading", { name: "Sign in to IT Service Desk" })).toBeVisible();
    await page.getByLabel("Email").fill(e2eAccounts.administrator.email);
    await page.getByRole("textbox", { name: "Password" }).fill(e2eAccounts.administrator.initialPassword);
    await page.locator("main section.card").screenshot({ path: `${evidenceDir}03_valid_login_filled.png` });
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "User Management" })).not.toBeVisible();
    await page.locator("main section.card").screenshot({ path: `${evidenceDir}04_first_login_gate.png` });

    await page.getByLabel("Current password").fill(e2eAccounts.administrator.initialPassword);
    await page.getByLabel("New password", { exact: true }).fill(e2eAccounts.administrator.changedPassword);
    await page.getByLabel("Confirm new password", { exact: true }).fill(e2eAccounts.administrator.changedPassword);
    await page.locator("main section.card").screenshot({ path: `${evidenceDir}05_password_change_form.png` });
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await expect(page.getByRole("button", { name: "User Management" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ticket Queue" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("AdminOne!2026");
    await expect(page.locator("header")).toContainText("ADMIN");
    await page.setViewportSize({ width: 1000, height: 750 });
    await page.screenshot({ path: `${evidenceDir}06_login_and_change_success.png`, clip: { x: 0, y: 0, width: 1000, height: 480 } });

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to IT Service Desk" })).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign in to IT Service Desk" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "User Management" })).not.toBeVisible();
    await page.locator("main section.card").screenshot({ path: `${evidenceDir}07_after_logout_protected.png` });
  });
});
