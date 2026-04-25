import { expect, test } from "@playwright/test";

interface BehavioralSignal {
  type: "dwell" | "skip" | "click" | "hover";
  card_id: string;
  duration_ms: number;
  timestamp: number;
}

interface SignalBatch {
  session_id: string;
  signals: BehavioralSignal[];
}

test.describe("Slice B — causal cursor signals", () => {
  test("given a visitor hovers a bento card past dwell threshold, the collector POSTs a batch with hover and dwell signals carrying card_id", async ({
    page,
  }) => {
    await page.goto("/?utm_source=linkedin");
    await expect(page.locator(".bento-grid")).toBeVisible({ timeout: 10_000 });

    const dwellRequest = page.waitForRequest(
      (req) => {
        if (!req.url().endsWith("/api/agent/signal")) return false;
        if (req.method() !== "POST") return false;
        const raw = req.postData();
        if (!raw) return false;
        const body = JSON.parse(raw) as SignalBatch;
        return body.signals.some((s) => s.type === "dwell");
      },
      { timeout: 15_000 },
    );

    const card = page.locator('[data-testid^="bento-card-"]').first();
    await card.hover();

    const req = await dwellRequest;
    const body = JSON.parse(req.postData() ?? "{}") as SignalBatch;

    expect(body.session_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    const dwell = body.signals.find((s) => s.type === "dwell");
    expect(dwell).toBeDefined();
    expect(dwell?.card_id).toMatch(/^[a-z0-9-]+$/);
    expect(dwell?.duration_ms).toBeGreaterThanOrEqual(1200);
    expect(body.signals.some((s) => s.type === "hover")).toBe(true);
  });
});
