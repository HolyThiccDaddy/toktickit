import { expect, test } from "../playwright.js";
import { fileURLToPath } from "node:url";
import { e2eAccounts, signInAs } from "../support/auth.js";

const attachmentFixture = fileURLToPath(new URL("../../artifacts/lab-02/screenshots/ticket-detail/01_ticket_detail_readonly.png", import.meta.url));

test.describe("Issue #37 authenticated requester ticket flow", () => {
  test("signs in, creates a ticket, opens detail, and removes an attachment", async ({ page }) => {
    await signInAs(page, e2eAccounts.david);
    await expect(page.getByText("David Lee", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "+ Create Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
    await page.getByLabel("Category").selectOption({ label: "Hardware" });
    await page.getByLabel("Related System").selectOption({ label: "Email" });
    await page.getByLabel("Ticket Summary").fill("E2E authenticated requester flow");
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
    const createdRow = page.getByRole("row").filter({ hasText: "E2E authenticated requester flow" });
    await expect(createdRow).toBeVisible();
    await createdRow.getByRole("button", { name: "View", exact: true }).click();

    await expect(page.getByRole("heading", { name: createdTicketNumber! })).toBeVisible();
    await expect(page.getByText("01_ticket_detail_readonly.png", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await page.getByLabel("Reason").fill("E2E cleanup after verification");
    await page.getByRole("button", { name: "Remove attachment", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Removed attachments" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download unavailable" })).toBeDisabled();
    await page.screenshot({ path: fileURLToPath(new URL("../../artifacts/lab-02/screenshots/release/desktop_ticket_detail_removed.png", import.meta.url)), fullPage: true });
  });
});
