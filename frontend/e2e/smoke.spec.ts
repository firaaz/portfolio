import { expect, test } from "@playwright/test";

test.describe("Walking skeleton", () => {
  test("page loads and shows loading state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("Loading");
  });

  test("SSE delivers manifest and hero renders", async ({ page }) => {
    await page.goto("/");

    const hero = page.locator("[data-zone='hero']");
    await expect(hero).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Firaaz Farook",
    );
    await expect(hero.locator("p")).toContainText("Senior Software Engineer");

    const flow = page.locator("[data-zone='flow']");
    await expect(flow).toBeVisible();
    await expect(flow.locator("> div")).not.toHaveCount(0);
  });
});
