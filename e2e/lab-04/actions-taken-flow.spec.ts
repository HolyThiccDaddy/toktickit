import { expect, test } from "../playwright.js";
import { e2eAccounts, signInAs, signInAsAdmin, signInAsStaff } from "../support/auth.js";

test.describe("Lab 4 Actions Taken UI", () => {
  test("keeps requester history read-only and gives staff/admin the shared action controls", async ({ page }) => {
    const summary = "Lab 4 Actions Taken UI E2E";

    await signInAs(page, e2eAccounts.jennifer);
    await page.getByRole("button", { name: "+ Create Ticket" }).click();
    await page.getByLabel("Category").selectOption({ label: "Network" });
    await page.getByLabel("Related System").selectOption({ label: "VPN" });
    await page.getByLabel("Ticket Summary").fill(summary);
    await page.getByLabel("Description").fill("Verify the Actions Taken UI across requester, staff, and administrator roles.");
    await page.getByLabel("Requested Priority").selectOption("MEDIUM");
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Ticket created successfully" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to IT Service Desk" })).toBeVisible();

    await signInAsStaff(page, e2eAccounts.alexStaff);
    await page.getByLabel("Search queue").fill(summary);
    const queueRow = page.getByRole("row").filter({ hasText: summary });
    await expect(queueRow).toBeVisible();
    await queueRow.getByRole("button", { name: "Open", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Actions Taken", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Action" })).toBeVisible();
    await page.getByRole("button", { name: "Create Action" }).click();
    const actionAssignee = page.getByLabel("Assignee (optional)", { exact: true });
    await expect(actionAssignee).toBeVisible();
    await expect(actionAssignee.locator("option").filter({ hasText: "Alex Staff" })).toHaveCount(1);
    await page.getByLabel("Action date and time").fill("2026-10-31T09:30");
    await page.getByLabel("Description").fill("Checked the VPN gateway and replaced the failing route.");
    await page.getByLabel("Result").fill("The requester can connect successfully after the route change.");
    let firstCreate = true;
    await page.route("**/api/tickets/*/actions", async (route) => {
      if (route.request().method() === "POST" && firstCreate) {
        firstCreate = false;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "SERVICE_UNAVAILABLE", message: "Temporary Actions API failure" } }),
        });
        return;
      }
      await route.continue();
    });
    await page.getByRole("button", { name: "Save Action" }).click();
    await expect(page.getByRole("alert")).toContainText("Temporary Actions API failure");
    await page.getByRole("button", { name: "Save Action" }).click();
    await expect(page.getByText("The requester can connect successfully after the route change.")).toBeVisible();
    await page.unroute("**/api/tickets/*/actions");
    await expect(page.getByRole("button", { name: "Edit Action" })).toBeVisible();
    await page.getByRole("button", { name: "Edit Action" }).click();
    await page.getByLabel("Result").fill("The requester can connect successfully after the route change and validation.");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("The requester can connect successfully after the route change and validation.")).toBeVisible();
    await page.getByRole("button", { name: "View edit history" }).click();
    await expect(page.getByText("Prior result:")).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to IT Service Desk" })).toBeVisible();

    await signInAs(page, e2eAccounts.jennifer);
    await page.getByRole("button", { name: "My Tickets" }).click();
    const requesterRow = page.getByRole("row").filter({ hasText: summary });
    await expect(requesterRow).toBeVisible();
    await requesterRow.getByRole("button", { name: "View", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Actions Taken", exact: true })).toBeVisible();
    await expect(page.getByText("The requester can connect successfully after the route change and validation.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Action" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Edit Action" })).not.toBeVisible();
    await page.getByRole("button", { name: "View edit history" }).click();
    await expect(page.getByText("Prior result:")).toBeVisible();
    await expect(page.getByText("The requester can connect successfully after the route change.")).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to IT Service Desk" })).toBeVisible();

    await signInAsAdmin(page, e2eAccounts.administrator);
    await page.getByRole("button", { name: "Ticket Queue" }).click();
    await page.getByLabel("Search queue").fill(summary);
    const adminRow = page.getByRole("row").filter({ hasText: summary });
    await expect(adminRow).toBeVisible();
    await adminRow.getByRole("button", { name: "Open", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Actions Taken", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Action" })).toBeVisible();
  });
});
