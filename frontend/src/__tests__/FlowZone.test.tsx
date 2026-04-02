import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FlowZone } from "../canvas/FlowZone";

afterEach(() => {
  cleanup();
});

describe("FlowZone", () => {
  it("renders children in a CSS grid container", () => {
    const { container } = render(
      <FlowZone>
        <div>Card A</div>
        <div>Card B</div>
      </FlowZone>,
    );

    const grid = container.firstElementChild as HTMLElement;
    expect(grid).toBeInTheDocument();
    const style = window.getComputedStyle(grid);
    expect(style.display).toBe("grid");
  });

  it("uses asymmetric column layout", () => {
    const { container } = render(
      <FlowZone>
        <div>Card A</div>
      </FlowZone>,
    );

    const grid = container.firstElementChild as HTMLElement;
    const style = window.getComputedStyle(grid);
    expect(style.gridTemplateColumns).not.toBe("");
  });
});
