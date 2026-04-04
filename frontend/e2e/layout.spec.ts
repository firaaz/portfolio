import { expect, test } from "@playwright/test";

test.describe("Layout assertions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-zone='identity']")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("surface grid has 12 columns", async ({ page }) => {
    const grid = page.locator(".surface-grid");
    const cols = await grid.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns,
    );
    expect(cols.split(" ")).toHaveLength(12);
  });

  test("hero name uses Zilla Slab", async ({ page }) => {
    const name = page.locator("[data-zone='identity'] h1");
    const font = await name.evaluate(
      (el) => getComputedStyle(el).fontFamily,
    );
    expect(font).toContain("Zilla Slab");
  });

  test("identity zone spans columns 1-4", async ({ page }) => {
    const zone = page.locator("[data-zone='identity']");
    const col = await zone.evaluate(
      (el) => getComputedStyle(el).gridColumn,
    );
    expect(col).toMatch(/1\s*\/\s*5/);
  });

  test("featured zone spans columns 5-13", async ({ page }) => {
    const zone = page.locator("[data-zone='featured']");
    const col = await zone.evaluate(
      (el) => getComputedStyle(el).gridColumn,
    );
    expect(col).toMatch(/5\s*\/\s*13/);
  });

  test("featured zone has correct surface background", async ({ page }) => {
    const zone = page.locator("[data-zone='featured']");
    const bg = await zone.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bg).toBe("rgba(28, 36, 48, 0.06)");
  });

  test("all 8 zones are visible", async ({ page }) => {
    const zoneNames = [
      "identity", "featured", "experience", "other-work",
      "skills", "contact", "education", "command",
    ];
    for (const name of zoneNames) {
      await expect(page.locator(`[data-zone='${name}']`)).toBeVisible();
    }
  });
});
