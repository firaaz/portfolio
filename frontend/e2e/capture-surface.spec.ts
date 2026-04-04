import { expect, test } from "@playwright/test";

test.describe("Surface visual capture", () => {
  test("desktop rest state", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveScreenshot("capture-desktop-rest.png", {
      fullPage: true,
    });
  });

  test("desktop hover states", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });

    for (const zone of ["identity", "featured", "experience", "other-work", "skills", "contact"]) {
      await page.locator(`[data-zone='${zone}']`).hover();
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`capture-hover-${zone}.png`);
    }
  });

  test("reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveScreenshot("capture-reduced-motion.png", {
      fullPage: true,
    });
  });
});
