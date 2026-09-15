import { expect } from "../playwright.js";

export type E2EAccount = {
  email: string;
  initialPassword: string;
  changedPassword: string;
  currentPassword?: string;
};

export const e2eAccounts = {
  jennifer: { email: "jennifer.anderson@example.com", initialPassword: "RequesterOne!2026", changedPassword: "RequesterOneChanged!2026" } satisfies E2EAccount,
  michael: { email: "michael.brown@example.com", initialPassword: "RequesterTwo!2026", changedPassword: "RequesterTwoChanged!2026" } satisfies E2EAccount,
  sarah: { email: "sarah.johnson@example.com", initialPassword: "RequesterThree!2026", changedPassword: "RequesterThreeChanged!2026" } satisfies E2EAccount,
  david: { email: "david.lee@example.com", initialPassword: "RequesterFour!2026", changedPassword: "RequesterFourChanged!2026" } satisfies E2EAccount,
};

export async function signInAs(page: any, account: E2EAccount) {
  await page.goto("/");
  const loginHeading = page.getByRole("heading", { name: "Sign in to IT Service Desk" });
  const changePasswordHeading = page.getByRole("heading", { name: "Change your password" });
  const workspaceHeading = page.getByRole("heading", { name: /TokTickIT IT Service Desk/ });

  async function waitForAuthenticatedShell() {
    try {
      await expect(workspaceHeading.or(changePasswordHeading)).toBeVisible({ timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  async function attemptLogin(password: string) {
    await page.getByLabel("Email").fill(account.email);
    // The password visibility control shares the field's label in the rendered
    // form, so target the textbox role to avoid matching the toggle button.
    await page.getByRole("textbox", { name: "Password" }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    return waitForAuthenticatedShell();
  }

  if (await loginHeading.isVisible().catch(() => false)) {
    const current = account.currentPassword ?? account.initialPassword;
    let authenticated = await attemptLogin(current);
    if (!authenticated && current !== account.initialPassword) authenticated = await attemptLogin(account.initialPassword);
    if (!authenticated && current !== account.changedPassword) authenticated = await attemptLogin(account.changedPassword);
    if (!authenticated) throw new Error(`Unable to sign in as ${account.email}`);
  }

  await expect(workspaceHeading.or(changePasswordHeading)).toBeVisible();
  if (await changePasswordHeading.isVisible().catch(() => false)) {
    const nextPassword = account.changedPassword;
    await page.getByLabel("Current password").fill(account.currentPassword ?? account.initialPassword);
    await page.getByLabel("New password", { exact: true }).fill(nextPassword);
    await page.getByLabel("Confirm new password", { exact: true }).fill(nextPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    account.currentPassword = nextPassword;
  }

  await expect(workspaceHeading).toBeVisible();
}

export async function signOut(page: any) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to IT Service Desk" })).toBeVisible();
}
