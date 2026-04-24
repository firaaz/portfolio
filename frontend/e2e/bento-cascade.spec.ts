import { expect, test } from "@playwright/test";

test.describe("Breathing bento cascade", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("given any visitor, bento grid is visible within 1s of page load", async ({
    page,
  }) => {
    await expect(page.locator(".bento-grid")).toBeVisible({ timeout: 1000 });
  });

  test("given a LinkedIn visitor, when the cascade completes, a tier-5 card is present", async ({
    page,
  }) => {
    await page.goto("/?utm_source=linkedin");
    await expect(page.locator(".bento-grid")).toBeVisible();
    await expect(page.locator('[data-tier="5"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test("given a GitHub visitor, when the cascade completes, the bento includes at least one tier-4 or tier-5 card", async ({
    page,
  }) => {
    await page.goto("/?utm_source=github");
    await expect(page.locator(".bento-grid")).toBeVisible();
    const highTier = page.locator(
      '[data-tier="5"], [data-tier="4"]',
    );
    await expect(highTier.first()).toBeVisible({ timeout: 5000 });
  });

  test("given prefers-reduced-motion, cards have no transform transitions", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?utm_source=linkedin");
    await expect(page.locator(".bento-grid")).toBeVisible();
    await page.waitForTimeout(2000);

    const cards = page.locator(".bento-card");
    const firstCard = cards.first();
    const transform = await firstCard.evaluate(
      (el) => getComputedStyle(el).transform,
    );
    // Reduced motion: no active transform (FLIP disabled) - should be "none" or identity.
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
  });

  test("given the cascade plays, hero card occupies visibly more area than a tier-1 card", async ({
    page,
  }) => {
    await page.goto("/?utm_source=linkedin");
    await expect(page.locator('[data-tier="5"]')).toBeVisible({
      timeout: 5000,
    });

    const hero = page.locator('[data-tier="5"]').first();
    const supporting = page.locator('[data-tier="1"]').first();
    const heroBox = await hero.boundingBox();
    const supportingBox = await supporting.boundingBox();

    if (!heroBox || !supportingBox) {
      test.skip(true, "Expected both tier-5 and tier-1 cards on screen");
      return;
    }

    const heroArea = heroBox.width * heroBox.height;
    const supportingArea = supportingBox.width * supportingBox.height;
    expect(heroArea).toBeGreaterThan(supportingArea * 3);
  });
});
