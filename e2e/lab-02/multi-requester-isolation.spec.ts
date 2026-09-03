import { expect, test } from "../playwright.js";

const apiBaseUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:3002";

test.describe("Issue #11 multi-requester isolation", () => {
  test("keeps requester A tickets invisible and inaccessible to requester B", async ({ page, request }) => {
    const createdResponse = await request.post(`${apiBaseUrl}/api/tickets`, {
      headers: { "x-requester-id": "1" },
      multipart: {
        summary: "Isolation E2E fixture",
        description: "This ticket must remain private to requester A.",
        categoryId: "1",
        relatedSystemId: "1",
        requestedPriority: "LOW",
      },
    });
    expect(createdResponse.status()).toBe(201);
    const created = await createdResponse.json() as { id: number; ticketNumber: string };

    const forbiddenResponse = await request.get(`${apiBaseUrl}/api/tickets/${created.id}`, {
      headers: { "x-requester-id": "2" },
    });
    expect(forbiddenResponse.status()).toBe(403);

    await page.goto("/");
    await page.getByLabel("Development Requester").selectOption({ label: "Michael Brown - Information Technology" });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByText(created.ticketNumber, { exact: true })).toHaveCount(0);
    await expect(page.getByText("Isolation E2E fixture", { exact: true })).toHaveCount(0);
  });
});
