import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ZoneLabel } from "../canvas/ZoneLabel";

afterEach(cleanup);

describe("ZoneLabel", () => {
  it("renders label text", () => {
    render(<ZoneLabel>Identity</ZoneLabel>);
    expect(screen.getByText("Identity")).toBeInTheDocument();
  });

  it("applies uppercase styling", () => {
    const { container } = render(<ZoneLabel>Featured Work</ZoneLabel>);
    const el = container.firstElementChild!;
    expect(el.className).toContain("uppercase");
  });
});
