import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PresenceDot } from "../chrome/PresenceDot";

afterEach(() => {
  cleanup();
});

describe("PresenceDot", () => {
  it("has aria-label for accessibility", () => {
    render(<PresenceDot />);
    expect(screen.getByLabelText("AI agent active")).toBeInTheDocument();
  });

  it("is visible", () => {
    render(<PresenceDot />);
    const dot = screen.getByLabelText("AI agent active");
    expect(dot).toBeVisible();
  });

  it("renders at viewport edge with fixed positioning", () => {
    render(<PresenceDot />);
    const dot = screen.getByLabelText("AI agent active");
    expect(dot.style.position).toBe("fixed");
  });
});
