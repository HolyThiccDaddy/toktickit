import { expect, test } from "../playwright.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outputDirectory = fileURLToPath(new URL("../../artifacts/lab-02/screenshots/release/", import.meta.url));

async function assertNoHorizontalOverflow(page: any) {
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
}

async function firstVisible(locator: any) {
  for (let index = 0; index < await locator.count(); index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible()) return candidate;
  }
  throw new Error("Expected a matching visible element, but all matches were hidden.");
}

async function capture(page: any, testInfo: any, screen: string) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(outputDirectory, `${testInfo.project.name}_${screen}.png`),
    fullPage: true,
  });
}

test("covers the requester journey across Create Ticket, My Tickets, and Ticket Detail", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByLabel("Development Requester").selectOption({ label: "Jennifer Anderson - Human Resources" });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /TokTickIT IT Service Desk/ })).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await capture(page, testInfo, "requester_workspace");

  await page.getByRole("button", { name: "+ Create Ticket" }).click();
  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await capture(page, testInfo, "create_ticket");

  const summary = `Responsive ${testInfo.project.name} ticket`;
  await page.getByLabel("Category").selectOption({ label: "Hardware" });
  await page.getByLabel("Related System").selectOption({ label: "Email" });
  await page.getByLabel("Ticket Summary").fill(summary);
  await page.getByLabel("Description").fill("Verify responsive Create Ticket, My Tickets, and Ticket Detail layouts.");
  await page.getByLabel("Requested Priority").selectOption("MEDIUM");
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(page.getByRole("heading", { name: "Ticket created successfully" })).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await capture(page, testInfo, "create_success");

  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(await firstVisible(page.getByText(summary, { exact: true }))).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await capture(page, testInfo, "my_tickets");

  await (await firstVisible(page.getByRole("button", { name: /^View/ }))).click();
  await expect(page.getByRole("heading", { name: /TKT-\d{4}-\d{6}/ })).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await capture(page, testInfo, "ticket_detail");
});
