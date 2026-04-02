import { expect, test } from "@playwright/test";

test.describe("Visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("[data-zone='hero']")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator("[data-zone='flow']")).toBeVisible();
    await expect(page.locator("[data-zone='background']")).toBeVisible();
  });

  test("full page layout", async ({ page }) => {
    await expect(page).toHaveScreenshot("full-page.png", {
      fullPage: true,
    });
  });

  test("hero zone", async ({ page }) => {
    const hero = page.locator("[data-zone='hero']");
    await expect(hero).toHaveScreenshot("hero-zone.png");
  });

  test("flow zone", async ({ page }) => {
    const flow = page.locator("[data-zone='flow']");
    await expect(flow).toHaveScreenshot("flow-zone.png");
  });

  test("background zone", async ({ page }) => {
    const bg = page.locator("[data-zone='background']");
    await expect(bg).toHaveScreenshot("background-zone.png");
  });
});
