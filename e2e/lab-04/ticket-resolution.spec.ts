import { expect, test } from "../playwright.js";
import { e2eAccounts, signInAs, signInAsStaff } from "../support/auth.js";

test("enforces the resolution gate and supports a confirmed reopen", async ({ page }) => {
  const summary = "Lab 4 ticket resolution gate E2E";
  await signInAs(page, e2eAccounts.jennifer);
  await page.getByRole("button", { name: "+ Create Ticket" }).click();
  await page.getByLabel("Category").selectOption({ label: "Network" });
  await page.getByLabel("Related System").selectOption({ label: "VPN" });
  await page.getByLabel("Ticket Summary").fill(summary);
  await page.getByLabel("Description").fill("Verify the status transition and resolution evidence gate.");
  await page.getByLabel("Requested Priority").selectOption("MEDIUM");
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(page.getByRole("heading", { name: "Ticket created successfully" })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();

  await signInAsStaff(page, e2eAccounts.alexStaff);
  await page.getByLabel("Search queue").fill(summary);
  const row = page.getByRole("row").filter({ hasText: summary });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByRole("heading", { name: /TKT-\d{4}-\d{6}/ })).toBeVisible();

  await page.getByLabel("Move status").selectOption("OPEN");
  await page.getByRole("button", { name: "Update status" }).click();
  await page.getByLabel("Move status").selectOption("IN_PROGRESS");
  await page.getByRole("button", { name: "Update status" }).click();

  await page.getByRole("button", { name: "Create Action" }).click();
  await page.getByLabel("Action date and time").fill("2026-10-31T10:00");
  await page.getByLabel("Description").fill("Restored the VPN service and verified connectivity.");
  await page.getByLabel("Result").fill("Requester confirmed the connection works.");
  await page.getByRole("button", { name: "Save Action" }).click();
  const actionCard = page.locator(".actions-taken-card").first();
  await actionCard.getByRole("combobox").selectOption("COMPLETED");
  await actionCard.getByRole("button", { name: "Update Action state" }).click();
  await expect(actionCard).toContainText("COMPLETED");

  await page.getByLabel("Move status").selectOption("RESOLVED");
  await page.getByLabel("Confirm transition").check();
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByRole("alert")).toContainText("completed qualifying Action");
  await page.getByLabel("Resolution Action evidence").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.locator(".staff-ticket-detail > div").first().getByText("RESOLVED")).toBeVisible();

  await page.getByLabel("Move status").selectOption("REOPENED");
  await page.getByLabel("Confirm transition").check();
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.locator(".staff-ticket-detail > div").first().getByText("REOPENED")).toBeVisible();
});
