import { expect, test } from "@playwright/test";

test.describe("Breathing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("featured zone expands on 2s dwell", async ({ page }) => {
    const zone = page.locator("[data-zone='featured']");
    const extra = zone.locator(".breathing-extra");

    await expect(extra).not.toBeVisible();

    await zone.hover();
    await page.waitForTimeout(2500);

    await expect(zone).toHaveAttribute("data-breathing", "true");
    await expect(extra).toBeVisible();
    await expect(zone).toHaveScreenshot("breathing-featured-expanded.png");
  });

  test("zone contracts after mouse leave with linger", async ({ page }) => {
    const zone = page.locator("[data-zone='featured']");
    const extra = zone.locator(".breathing-extra");

    await zone.hover();
    await page.waitForTimeout(2500);
    await expect(extra).toBeVisible();

    await page.mouse.move(0, 0);
    await page.waitForTimeout(1200);

    await expect(zone).toHaveAttribute("data-breathing", "false");
  });

  test("short hover shows tonal lift only, no breathing", async ({ page }) => {
    const zone = page.locator("[data-zone='featured']");
    const extra = zone.locator(".breathing-extra");

    await zone.hover();
    await page.waitForTimeout(500);

    await expect(extra).not.toBeVisible();
    await expect(zone).toHaveAttribute("data-breathing", "false");
  });

  test("prefers-reduced-motion disables grid transitions", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });

    const grid = page.locator(".surface-grid");
    const duration = await grid.evaluate(
      (el) => getComputedStyle(el).transitionDuration,
    );
    expect(duration).toBe("0s");
  });
});
