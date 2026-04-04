import { expect, test } from "@playwright/test";

test.describe("Visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("full surface", async ({ page }) => {
    await expect(page).toHaveScreenshot("full-surface.png", {
      fullPage: true,
    });
  });

  for (const zone of [
    "identity", "featured", "experience", "other-work",
    "skills", "contact", "education", "command",
  ]) {
    test(`zone: ${zone}`, async ({ page }) => {
      const el = page.locator(`[data-zone='${zone}']`);
      await expect(el).toHaveScreenshot(`zone-${zone}.png`);
    });
  }
});
