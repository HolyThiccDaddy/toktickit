import { expect, test } from "../playwright.js";
import { e2eAccounts, signInAs, signOut } from "../support/auth.js";

test.describe("Issue #37 multi-requester isolation", () => {
  test("keeps requester A tickets invisible to requester B", async ({ page }) => {
    await signInAs(page, e2eAccounts.jennifer);
    await page.getByRole("button", { name: "+ Create Ticket" }).click();
    await page.getByLabel("Category").selectOption({ label: "Network" });
    await page.getByLabel("Related System").selectOption({ label: "VPN" });
    await page.getByLabel("Ticket Summary").fill("Authenticated ownership isolation");
    await page.getByLabel("Description").fill("This ticket must remain private to requester A.");
    await page.getByLabel("Requested Priority").selectOption("LOW");
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Ticket created successfully" })).toBeVisible();
    const ticketNumber = (await page.getByText(/TKT-\d{4}-\d{6}/).first().innerText()).match(/TKT-\d{4}-\d{6}/)?.[0];
    expect(ticketNumber).toBeTruthy();

    await signOut(page);
    await signInAs(page, e2eAccounts.michael);
    await page.getByRole("button", { name: "My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByText(ticketNumber!, { exact: true })).toHaveCount(0);
    await expect(page.getByText("Authenticated ownership isolation", { exact: true })).toHaveCount(0);
  });
});
