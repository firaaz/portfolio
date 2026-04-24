import { expect, test } from "@playwright/test";

// Deterministic snapshot for scenario 5 — the live LLM cascade for the LinkedIn
// persona doesn't reliably land items in the tier-1 salience band (0.15–0.35),
// so we seed pre-quantized salience values to test tier math independently of
// LLM variance. SSE wire format source of truth: backend/src/app/adapters/api/ux_events.py
const SCENARIO_5_FIXTURE_ITEMS = [
  {
    id: "hero",
    salience: 0.95,
    group: "identity",
    molecule: "hero",
    data: {
      name: "Firaaz Farook",
      title: "Senior Software Engineer",
      subtitle: "AI Systems & Agentic Platforms",
      summary: "Fixture snapshot for scenario 5.",
    },
  },
  {
    id: "project-salama",
    salience: 0.65,
    group: "work",
    molecule: "project",
    data: {
      title: "Salama AI Platform",
      description: "Fixture project card.",
      tech: ["LangGraph", "Python", "FastAPI"],
    },
  },
  {
    id: "education-be",
    salience: 0.2,
    group: "background",
    molecule: "education",
    data: {
      degree: "B.E. Computer Science",
      institution: "University of Peradeniya",
    },
  },
  {
    id: "skill-aws",
    salience: 0.05,
    group: "background",
    molecule: "skill",
    data: { name: "AWS ML" },
  },
];

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
      timeout: 10_000,
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
    await expect(highTier.first()).toBeVisible({ timeout: 10_000 });
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
    const snapshotEvent = {
      type: "STATE_SNAPSHOT",
      snapshot: {
        ux: { tempo: 0.5, agency: 0.5 },
        items: SCENARIO_5_FIXTURE_ITEMS,
      },
    };
    const sseBody = `data: ${JSON.stringify(snapshotEvent)}\n\n`;
    await page.route("**/api/agent/stream", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "cache-control": "no-cache" },
        body: sseBody,
      });
    });

    await page.goto("/?utm_source=linkedin");
    await expect(page.locator('[data-tier="5"]')).toBeVisible({
      timeout: 10_000,
    });

    const hero = page.locator('[data-tier="5"]').first();
    const supporting = page.locator('[data-tier="1"]').first();
    const heroBox = await hero.boundingBox();
    const supportingBox = await supporting.boundingBox();

    expect(heroBox, "tier-5 hero card should be on screen").toBeTruthy();
    expect(supportingBox, "tier-1 supporting card should be on screen").toBeTruthy();

    const heroArea = (heroBox?.width ?? 0) * (heroBox?.height ?? 0);
    const supportingArea =
      (supportingBox?.width ?? 0) * (supportingBox?.height ?? 0);
    expect(heroArea).toBeGreaterThan(supportingArea * 3);
  });
});
