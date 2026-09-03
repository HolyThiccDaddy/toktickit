import { expect, test } from "@playwright/test";
import path from "node:path";

const attachmentFixture = path.resolve("artifacts/lab-02/screenshots/ticket-detail/01_ticket_detail_readonly.png");

test.describe("Issue #11 requester ticket flow", () => {
  test("selects a requester, creates a ticket, opens detail, and removes an attachment", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Select Development Requester" })).toBeVisible();

    await page.getByLabel("Development Requester").selectOption({ label: "Jennifer Anderson - Human Resources" });
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: /TokTickIT IT Service Desk/ })).toBeVisible();
    await expect(page.getByText("Jennifer Anderson", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "+ Create Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
    await page.getByLabel("Category").selectOption({ label: "Hardware" });
    await page.getByLabel("Related System").selectOption({ label: "Email" });
    await page.getByLabel("Ticket Summary").fill("E2E requester ticket flow");
    await page.getByLabel("Description").fill("Verify the complete requester ticket journey with attachment management.");
    await page.getByLabel("Requested Priority").selectOption("HIGH");
    await page.locator("#attachments").setInputFiles(attachmentFixture);
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    await expect(page.getByRole("heading", { name: "Ticket created successfully" })).toBeVisible();
    const ticketNumber = page.getByText(/TKT-\d{4}-\d{6}/).first();
    await expect(ticketNumber).toBeVisible();
    const createdTicketNumber = (await ticketNumber.innerText()).match(/TKT-\d{4}-\d{6}/)?.[0];
    expect(createdTicketNumber).toBeTruthy();
    await expect(page.getByText(/Created:/)).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    const createdRow = page.getByRole("row").filter({ hasText: "E2E requester ticket flow" });
    await expect(createdRow).toBeVisible();
    await createdRow.getByRole("button", { name: "View", exact: true }).click();

    await expect(page.getByRole("heading", { name: createdTicketNumber! })).toBeVisible();
    await expect(page.getByText("01_ticket_detail_readonly.png", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await page.getByLabel("Reason").fill("E2E cleanup after verification");
    await page.getByRole("button", { name: "Remove attachment", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Removed attachments" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download unavailable" })).toBeDisabled();
    await page.screenshot({ path: "artifacts/lab-02/screenshots/release/desktop_ticket_detail_removed.png", fullPage: true });
  });
});
