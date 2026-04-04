import { expect, test } from "@playwright/test";

test.describe("Walking skeleton", () => {
  test("page loads and shows loading state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("Loading");
  });

  test("SSE delivers data and identity zone renders", async ({ page }) => {
    await page.goto("/");

    const identity = page.locator("[data-zone='identity']");
    await expect(identity).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Firaaz Farook",
    );

    const featured = page.locator("[data-zone='featured']");
    await expect(featured).toBeVisible();
  });
});
