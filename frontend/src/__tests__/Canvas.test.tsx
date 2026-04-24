import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Canvas } from "../canvas/Canvas";
import { useUXStore } from "../store/ux-store";

describe("Canvas", () => {
  afterEach(() => {
    useUXStore.setState({ items: [], bridges: [] });
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
    // Neutral salience 0.5 -> tier 3 -> colSpan 2
    const style = card.getAttribute("style") ?? "";
    expect(style).toMatch(/grid-column:\s*span\s*2/);
  });
});
