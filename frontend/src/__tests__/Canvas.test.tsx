import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Canvas } from "../canvas/Canvas";
import { useUXStore } from "../store/ux-store";

describe("Canvas", () => {
  afterEach(() => {
    useUXStore.setState({ items: [], bridges: [] });
    sessionStorage.clear();
    cleanup();
  });

  it("renders the bento content region", () => {
    render(<Canvas onPresenceDotClick={vi.fn()} />);
    expect(
      screen.getByRole("region", { name: /content/i }),
    ).toBeInTheDocument();
  });

  it("renders presence dot chrome", () => {
    render(<Canvas onPresenceDotClick={vi.fn()} />);
    expect(screen.getByText("⌘K")).toBeInTheDocument();
    expect(screen.getByText(/ask me anything/i)).toBeInTheDocument();
  });

  it("given items with zero salience, renders them at neutral salience", () => {
    useUXStore.setState({
      items: [
        {
          id: "hero",
          salience: 0,
          group: "identity",
          molecule: "hero",
          data: { name: "Test" },
        },
      ],
      bridges: [],
    });
    render(<Canvas onPresenceDotClick={vi.fn()} />);
    const card = screen.getByTestId("bento-card-hero");
    // Neutral salience 0.5 falls in [0.35, 0.55) -> tier 2 -> colSpan 2
    const style = card.getAttribute("style") ?? "";
    expect(style).toMatch(/grid-column:\s*span\s*2/);
  });

  it("given a hover that lasts past the dwell threshold, posts a batch with hover and dwell signals", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    useUXStore.setState({
      items: [
        {
          id: "hero",
          salience: 0.7,
          group: "identity",
          molecule: "hero",
          data: { name: "Test" },
        },
      ],
      bridges: [],
    });

    try {
      render(<Canvas onPresenceDotClick={vi.fn()} />);
      const card = screen.getByTestId("bento-card-hero");
      fireEvent.mouseEnter(card);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1300); // past dwell threshold
        await vi.advanceTimersByTimeAsync(4000); // past collector flush interval
      });

      expect(fetchSpy).toHaveBeenCalled();
      const [url, init] = fetchSpy.mock.calls[0] ?? [];
      expect(url).toBe("/api/agent/signal");
      const body = JSON.parse(String(init?.body));
      expect(body.session_id).toMatch(/^[0-9a-f-]{36}$/);
      const types = body.signals.map((s: { type: string }) => s.type);
      expect(types).toContain("hover");
      expect(types).toContain("dwell");
      const dwell = body.signals.find(
        (s: { type: string; card_id: string }) =>
          s.type === "dwell" && s.card_id === "hero",
      );
      expect(dwell.duration_ms).toBeGreaterThanOrEqual(1200);
    } finally {
      vi.useRealTimers();
      fetchSpy.mockRestore();
    }
  });
});
