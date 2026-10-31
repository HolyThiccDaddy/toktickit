import { expect, test } from "../playwright.js";
import { e2eAccounts, signInAs, signInAsAdmin, signInAsStaff, signOut } from "../support/auth.js";
import { mkdir } from "node:fs/promises";

async function capture(page: any, project: string, name: string) {
  const directory = `../artifacts/lab-04/screenshots/release/${project}`;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
}

test.describe("Lab 4 final release evidence", () => {
  test("captures requester, staff, administrator, and Actions Taken views", async ({ page }, testInfo) => {
    await signInAs(page, e2eAccounts.jennifer);
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Requester Dashboard" })).toBeVisible();
    await capture(page, testInfo.project.name, "01_requester_dashboard");
    await signOut(page);

    await signInAsStaff(page, e2eAccounts.alexStaff);
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "IT Staff Dashboard" })).toBeVisible();
    await capture(page, testInfo.project.name, "02_staff_dashboard");
    await page.getByRole("button", { name: "My Actions", exact: true }).click();
    await expect(page.getByRole("heading", { name: "My Actions Taken" })).toBeVisible();
    await capture(page, testInfo.project.name, "03_staff_actions");
    await signOut(page);

    await signInAsAdmin(page, e2eAccounts.administrator);
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Administrator Dashboard" })).toBeVisible();
    await capture(page, testInfo.project.name, "04_admin_dashboard");
  });

  test("captures loading, empty, error, and forbidden dashboard states", async ({ page }, testInfo) => {
    await signInAs(page, e2eAccounts.jennifer);
    let releasePending!: () => void;
    const pending = new Promise<void>((resolve) => { releasePending = resolve; });
    await page.route("**/api/dashboard/requester*", async (route) => {
      await pending;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { metrics: [], items: [], meta: { timezone: "UTC", from: "2026-10-01T00:00:00.000Z", to: "2026-10-31T00:00:00.000Z" } } }) });
    });
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
    await expect(page.getByText("Loading requester dashboard...", { exact: true })).toBeVisible();
    await capture(page, testInfo.project.name, "05_requester_loading");
    releasePending();
    await expect(page.getByText("No recent tickets match this dashboard window.")).toBeVisible();
    await capture(page, testInfo.project.name, "06_requester_empty");
    await page.unroute("**/api/dashboard/requester*");
    await signOut(page);

    await signInAs(page, e2eAccounts.jennifer);
    await page.route("**/api/dashboard/requester*", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "SERVICE_UNAVAILABLE", message: "Dashboard temporarily unavailable" } }) }));
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Dashboard temporarily unavailable");
    await capture(page, testInfo.project.name, "07_requester_error_retry");
    await page.unroute("**/api/dashboard/requester*");
    await signOut(page);

    await signInAsStaff(page, e2eAccounts.alexStaff);
    await page.route("**/api/dashboard/staff*", (route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: "FORBIDDEN", message: "Only IT Staff or Administrators may access this dashboard" } }) }));
    await page.getByRole("button", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Only IT Staff or Administrators");
    await capture(page, testInfo.project.name, "08_staff_forbidden");
    await page.unroute("**/api/dashboard/staff*");
  });

  test("captures the staff workflow and resolution gate", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Workflow evidence is captured at desktop width.");
    await signInAsStaff(page, e2eAccounts.alexStaff);
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
    const firstRow = page.getByRole("row").nth(1);
    await expect(firstRow).toBeVisible();
    await firstRow.getByRole("button", { name: "Open", exact: true }).click();
    await expect(page.getByRole("heading", { name: /TKT-\d{4}-\d{6}/ })).toBeVisible();
    await capture(page, testInfo.project.name, "09_staff_ticket_resolution_gate");
  });
});
