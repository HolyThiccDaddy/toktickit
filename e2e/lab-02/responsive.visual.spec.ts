import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test("captures the requester workspace at the configured responsive viewport", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByLabel("Development Requester").selectOption({ label: "Jennifer Anderson - Human Resources" });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /TokTickIT IT Service Desk/ })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);

  const outputDirectory = path.resolve("artifacts/lab-02/screenshots/release");
  fs.mkdirSync(outputDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(outputDirectory, `${testInfo.project.name}_requester_workspace.png`),
    fullPage: true,
  });
});
