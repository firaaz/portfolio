import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

test.describe("Slice D8 — mobile WhisperLayer disclosure", () => {
  test("given a whisper utterance arrives on a 375px viewport, the layer renders a closed <details> whose summary expands on click", async ({
    page,
  }) => {
    const utteranceEvent = `data: ${JSON.stringify({
      type: "CUSTOM",
      custom: {
        eventType: "voice:utterance",
        voice_tag: "whisper",
        utterance_kind: "observation",
        content: "reading slowly here",
        references: [],
      },
    })}\n\n`;

    await page.route("**/api/agent/stream*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: utteranceEvent,
      });
    });

    await page.goto("/");

    const summary = page.getByText("Notes from the agent");
    await expect(summary).toBeVisible({ timeout: 10_000 });
    expect(await summary.evaluate((el) => el.tagName)).toBe("SUMMARY");

    const details = page.locator("details").filter({ has: summary });
    expect(
      await details.evaluate((el: HTMLDetailsElement) => el.open),
    ).toBe(false);

    await summary.click();
    expect(
      await details.evaluate((el: HTMLDetailsElement) => el.open),
    ).toBe(true);
  });
});
