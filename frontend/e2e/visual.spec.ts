import { expect, test } from "@playwright/test";

test.describe("Visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("full page layout", async ({ page }) => {
    await expect(page).toHaveScreenshot("full-page.png", {
      fullPage: true,
    });
  });

  test("identity zone", async ({ page }) => {
    const zone = page.locator("[data-zone='identity']");
    await expect(zone).toHaveScreenshot("zone-identity.png");
  });

  test("featured zone", async ({ page }) => {
    const zone = page.locator("[data-zone='featured']");
    await expect(zone).toHaveScreenshot("zone-featured.png");
  });
});
