import { expect, test } from "../playwright.js";
import { e2eAccounts, navigateTo, signInAs, signInAsStaff, signOut } from "../support/auth.js";
import { evidencePath } from "../support/evidence.js";

async function capture(page: any, project: string, name: string) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (name.includes("filled")) {
    // Keep the tested breakpoint width. A taller capture viewport prevents
    // sticky chrome from covering part of a long form during native cropping.
    const viewport = page.viewportSize()!;
    await page.evaluate(() => window.scrollTo(0, 0));
    const bounds = await page.locator(".actions-taken-form").boundingBox();
    if (bounds) await page.setViewportSize({ width: viewport.width, height: Math.ceil(bounds.y + bounds.height + 160) });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator(".actions-taken-form").screenshot({ path: evidencePath(`../artifacts/lab-04/screenshots/compliance/${project}/${name}-form.png`) });
    await page.setViewportSize(viewport);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: evidencePath(`../artifacts/lab-04/screenshots/compliance/${project}/${name}.png`), fullPage: true });
}

test("preserves sticky navigation, keyboard access, and reduced motion at each breakpoint", async ({ page }, info) => {
  await signInAsStaff(page, e2eAccounts.alexStaff);
  await navigateTo(page, "Dashboard");
  await expect(page.getByRole("heading", { name: "IT Staff Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Unassigned Tickets/ })).toBeVisible();
  const mobile = page.viewportSize()!.width < 768;
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => page.locator(".ops-sidebar").evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(0);
  await expect.poll(() => page.locator(".ops-topbar").evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(mobile ? 64 : 0);
  if (mobile) {
    const menu = page.locator('button[aria-controls="ops-workspace-nav"]');
    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("button", { name: "Dashboard", exact: true }).focus();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(await page.locator("#ops-workspace-nav").evaluate((el) => (el as HTMLElement).inert)).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator(".ops-view").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--zen-green").trim())).toBe("#006b3c");
  if (info.project.name === "desktop") {
    const originalViewport = page.viewportSize()!;
    for (const width of [320, 390, 767, 768, 991, 992, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator(".ops-ticket-title, .ops-ticket-link-summary").evaluateAll((nodes) => nodes.every((el) => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1)), `Ticket summaries wrap at ${width}px`).toBe(true);
      await capture(page, "breakpoints", `${width}px-dashboard`);
    }
    await page.setViewportSize(originalViewport);
  }
  await capture(page, info.project.name, "sticky-shell-reduced-motion");
});

test("preserves real Action create/edit and requester read-only views at each breakpoint", async ({ page }, info) => {
  const summary = `Responsive Action ${info.project.name} ${Date.now()}`;
  await signInAs(page, e2eAccounts.jennifer);
  await navigateTo(page, "+ Create Ticket");
  await page.getByLabel("Category").selectOption({ label: "Network" });
  await page.getByLabel("Related System").selectOption({ label: "VPN" });
  await page.getByLabel("Ticket Summary").fill(summary);
  await page.getByLabel("Description").fill("Verify real responsive Actions Taken and requester visibility after the UI rework.");
  await page.getByLabel("Requested Priority").selectOption("HIGH");
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(page.getByRole("heading", { name: "Ticket created successfully" })).toBeVisible();
  await signOut(page);
  await signInAsStaff(page, e2eAccounts.alexStaff);
  await page.getByLabel("Search queue").fill(summary);
  const mobile = page.viewportSize()!.width < 768;
  const staffTicket = mobile ? page.getByTestId("staff-ticket-card-list").getByRole("article").filter({ hasText: summary }) : page.getByRole("row").filter({ hasText: summary });
  await staffTicket.getByRole("button", { name: mobile ? "Open ticket" : "Open", exact: true }).click();
  await page.getByRole("button", { name: "Create Action", exact: true }).click();
  await page.getByLabel("Action date and time").fill(new Date(Date.now() - 86_400_000).toISOString().slice(0, 16));
  await page.getByLabel("Description", { exact: true }).fill("Verified the VPN route and restored normal service.");
  await page.getByLabel("Result", { exact: true }).fill("The connection is stable after verification.");
  const assignee = page.getByLabel("Assignee (optional)", { exact: true });
  await assignee.selectOption((await assignee.locator("option").filter({ hasText: "Alex Staff" }).getAttribute("value"))!);
  await capture(page, info.project.name, "action-create-filled");
  await page.getByRole("button", { name: "Save Action", exact: true }).click();
  await expect(page.getByText("The connection is stable after verification.", { exact: true })).toBeVisible();
  await capture(page, info.project.name, "action-list");
  await page.getByRole("button", { name: "Edit Action", exact: true }).click();
  await page.getByLabel("Result", { exact: true }).fill("The connection remains stable after a second verification.");
  await capture(page, info.project.name, "action-edit-filled");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("The connection remains stable after a second verification.", { exact: true })).toBeVisible();
  await signOut(page);
  await signInAs(page, e2eAccounts.jennifer);
  await navigateTo(page, "My Tickets");
  await page.getByLabel("Search tickets", { exact: true }).fill(summary);
  const requesterTicket = mobile ? page.getByTestId("ticket-card-list").getByRole("article").filter({ hasText: summary }) : page.getByRole("row").filter({ hasText: summary });
  await requesterTicket.getByRole("button", { name: mobile ? "View ticket" : "View", exact: true }).click();
  await expect(page.getByText("The connection remains stable after a second verification.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Action", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit Action", exact: true })).toHaveCount(0);
  await capture(page, info.project.name, "action-requester-read-only");
});
