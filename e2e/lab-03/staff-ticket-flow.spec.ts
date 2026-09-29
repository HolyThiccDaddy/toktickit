import { expect, test } from "../playwright.js";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { e2eAccounts, signInAs, signInAsStaff } from "../support/auth.js";

const evidenceDir = fileURLToPath(new URL("../../artifacts/lab-03/screenshots/staff-flow/states/", import.meta.url));
const attachmentFixture = fileURLToPath(new URL("../../artifacts/lab-02/screenshots/ticket-detail/01_ticket_detail_readonly.png", import.meta.url));
async function capture(page: any, name: string) {
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: `${evidenceDir}/${name}.png`, fullPage: true });
}
async function captureDetailCard(page: any, index: number, name: string) {
  await mkdir(evidenceDir, { recursive: true });
  await page.locator(".staff-ticket-detail .card").nth(index).screenshot({ path: `${evidenceDir}/${name}.png` });
}

test.describe("Issue #38 IT Staff queue and ticket operations", () => {
  test("opens the shared queue and staff ticket detail with safe communication controls", async ({ page }) => {
    await signInAs(page, e2eAccounts.sarah);
    await page.getByRole("button", { name: "+ Create Ticket" }).click();
    await page.getByLabel("Category").selectOption({ label: "Network" });
    await page.getByLabel("Related System").selectOption({ label: "VPN" });
    const categoryId = await page.getByLabel("Category").inputValue();
    const relatedSystemId = await page.getByLabel("Related System").inputValue();
    await page.getByLabel("Ticket Summary").fill("Staff queue E2E regression");
    await page.getByLabel("Description").fill("Verify that IT Staff can find and open a shared ticket.");
    await page.getByLabel("Requested Priority").selectOption("HIGH");
    await page.locator("#attachments").setInputFiles(attachmentFixture);
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Ticket created successfully" })).toBeVisible();
    // Create additional real tickets through the authenticated API so the
    // queue's second page is evidence from the running app, not a mock-up.
    const csrfResponse = await page.request.get("http://127.0.0.1:3002/api/auth/csrf");
    expect(csrfResponse.ok()).toBeTruthy();
    const { data: { csrfToken } } = await csrfResponse.json();
    for (let index = 1; index <= 21; index += 1) {
      const response = await page.request.post("http://127.0.0.1:3002/api/tickets", {
        headers: { "X-CSRF-Token": csrfToken },
        multipart: {
          categoryId,
          relatedSystemId,
          summary: `Evidence queue ticket ${String(index).padStart(2, "0")}`,
          description: "Deterministic requester-created E2E pagination evidence.",
          requestedPriority: "MEDIUM",
        },
      });
      expect(response.status(), `Creating queue evidence ticket ${index}`).toBe(201);
    }
    await page.getByRole("button", { name: "Back" }).click();
    // The API fixture call issued a fresh CSRF token. Reload so the UI obtains
    // that token instead of retaining its earlier one for Sign out.
    await page.reload();
    await expect(page.getByRole("heading", { name: /TokTickIT IT Service Desk/ })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to IT Service Desk" })).toBeVisible();

    await signInAsStaff(page, e2eAccounts.alexStaff);
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
    await page.getByLabel("Search queue").fill("Evidence queue ticket");
    await expect(page.getByText("21 results · Page 1 of 2")).toBeVisible();
    await capture(page, "01_queue_loaded");
    await page.locator('nav[aria-label="Staff queue pagination"]').locator("..").screenshot({ path: `${evidenceDir}/05_queue_page_1_of_2.png` });
    await page.getByRole("button", { name: "Page 2" }).click();
    await expect(page.getByText("21 results · Page 2 of 2")).toBeVisible();
    await capture(page, "06_queue_page_2_of_2");
    await page.getByRole("button", { name: "Page 1" }).click();
    await expect(page.getByText("21 results · Page 1 of 2")).toBeVisible();
    await page.getByLabel("Search queue").fill("");
    await page.getByLabel("Status", { exact: true }).selectOption("NEW");
    await page.getByLabel("IT Priority", { exact: true }).selectOption("HIGH");
    await page.getByLabel("Sort by", { exact: true }).selectOption("ticketNumber");
    await expect(page.getByRole("row").filter({ hasText: "Staff queue E2E regression" })).toBeVisible();
    await capture(page, "02_queue_filter_sort");
    await page.getByLabel("Search queue").fill("no-such-ticket-evidence-2026");
    await expect(page.getByRole("heading", { name: "No matching tickets found." })).toBeVisible();
    await capture(page, "03_queue_no_results");
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.route("**/api/staff/tickets?*", async (route) => {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "SERVICE_UNAVAILABLE", message: "Queue temporarily unavailable" } }) });
    });
    await page.getByLabel("Search queue").fill("temporary outage evidence");
    await expect(page.getByRole("alert")).toContainText("Unable to load ticket queue");
    await capture(page, "04_queue_retry_simulated_api_failure");
    await page.unroute("**/api/staff/tickets?*");
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("heading", { name: "No matching tickets found." })).toBeVisible();
    await page.getByLabel("Search queue").fill("Staff queue E2E regression");
    const row = page.getByRole("row").filter({ hasText: "Staff queue E2E regression" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Open", exact: true }).click();
    await expect(page.getByRole("heading", { name: /TKT-\d{4}-\d{6}/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Internal notes" })).toBeVisible();
    await expect(page.getByLabel("IT Priority")).toBeVisible();
    await expect(page.getByLabel("Move status")).toBeVisible();
    await expect(page.getByText("01_ticket_detail_readonly.png", { exact: true })).toBeVisible();
    await capture(page, "05_detail_unassigned_attachment");
    await captureDetailCard(page, 2, "10_attachment_continuity");

    await page.getByRole("button", { name: "Claim for me" }).click();
    await expect(page.getByRole("button", { name: "Claim for me" })).toBeDisabled();
    await capture(page, "06_detail_claimed");
    await captureDetailCard(page, 1, "11_claimed_operation");

    // Resolve the second staff member's ID from their authenticated session.
    // The tested reassignment is a real operation against the test database.
    const secondContext = await page.context().browser()!.newContext({ baseURL: "http://127.0.0.1:5173" });
    try {
      const secondPage = await secondContext.newPage();
      await signInAsStaff(secondPage, e2eAccounts.caseyStaff);
      const meResponse = await secondPage.request.get("http://127.0.0.1:3002/api/auth/me");
      expect(meResponse.ok()).toBeTruthy();
      const { data: secondStaff } = await meResponse.json();
      await page.getByLabel("Assignee ID").fill(String(secondStaff.id));
      await page.getByRole("button", { name: "Save assignment" }).click();
      await expect.poll(async () => {
        const response = await page.request.get("http://127.0.0.1:3002/api/staff/tickets?q=Staff%20queue%20E2E%20regression");
        const { data } = await response.json();
        return data.items[0]?.owner?.displayName;
      }).toBe("Casey Staff");
      await captureDetailCard(page, 1, "16_reassigned_operation");
    } finally {
      await secondContext.close();
    }

    await page.getByLabel("IT Priority").selectOption("URGENT");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByLabel("IT Priority")).toHaveValue("URGENT");
    await page.getByLabel("Move status").selectOption("OPEN");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.locator(".staff-ticket-detail > div").first().getByText("OPEN")).toBeVisible();
    await page.getByLabel("Move status").selectOption("IN_PROGRESS");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.locator(".staff-ticket-detail > div").first().getByText("IN_PROGRESS")).toBeVisible();
    await page.getByLabel("Move status").selectOption("RESOLVED");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByRole("alert")).toContainText("Confirm this status transition");
    await capture(page, "07_detail_confirmation_required");
    await captureDetailCard(page, 1, "12_confirm_required_operation");
    await page.getByLabel("Confirm transition").check();
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.locator(".staff-ticket-detail > div").first().getByText("RESOLVED")).toBeVisible();
    await capture(page, "08_detail_resolved");
    await captureDetailCard(page, 1, "13_resolved_operation");

    await page.getByLabel("Add a public comment").fill("Public E2E evidence: requester can read this update.");
    await page.getByRole("button", { name: "Post public comment" }).click();
    await expect(page.getByText("Public E2E evidence: requester can read this update.")).toBeVisible();
    await page.getByLabel("Add an internal note").fill("Internal E2E evidence: staff-only diagnostic note.");
    await page.getByRole("button", { name: "Add internal note" }).click();
    await expect(page.getByText("Internal E2E evidence: staff-only diagnostic note.")).toBeVisible();
    await capture(page, "09_detail_communication");
    await captureDetailCard(page, 3, "14_public_comment");
    await captureDetailCard(page, 4, "15_internal_note");

    await page.getByRole("button", { name: "Back to queue" }).click();
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
    await page.getByLabel("Sort by", { exact: true }).selectOption("ticketNumber");
    await page.getByLabel("Sort direction").selectOption("asc");
    await expect(page.getByRole("row").filter({ hasText: "Staff queue E2E regression" })).toContainText("Casey Staff");
    await expect(page.getByRole("row").filter({ hasText: "Evidence queue ticket 01" })).toContainText("Unassigned");
    await page.screenshot({ path: `${evidenceDir}/07_queue_assigned_unassigned.png` });

    await page.getByRole("button", { name: "Sign out" }).click();
    await signInAs(page, e2eAccounts.sarah);
    await expect(page.getByRole("button", { name: "Ticket Queue" })).not.toBeVisible();
    const forbidden = await page.request.get("http://127.0.0.1:3002/api/staff/tickets");
    expect(forbidden.status()).toBe(403);
    await page.screenshot({ path: `${evidenceDir}/17_requester_staff_access_denied.png` });
  });

  test("keeps queue sorting controls usable with mobile ticket cards", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 844 });
    await signInAsStaff(page, e2eAccounts.alexStaff);

    await expect(page.getByTestId("staff-ticket-card-list")).toBeVisible();
    await expect(page.getByLabel("Sort by", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Sort direction")).toBeVisible();
    await page.getByLabel("Sort by", { exact: true }).selectOption("itPriority");
    await page.getByLabel("Sort direction").selectOption("asc");
    await expect(page.getByLabel("Sort by", { exact: true })).toHaveValue("itPriority");
    await expect(page.getByLabel("Sort direction")).toHaveValue("asc");
    const forbidden = await page.request.get("http://127.0.0.1:3002/api/admin/users");
    expect(forbidden.status()).toBe(403);
    await page.screenshot({ path: `${evidenceDir}/18_staff_admin_access_denied.png` });
  });
});
