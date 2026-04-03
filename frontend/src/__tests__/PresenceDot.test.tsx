import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PresenceDot } from "../chrome/PresenceDot";

afterEach(() => {
  cleanup();
});

describe("PresenceDot", () => {
  it("has aria-label for accessibility", () => {
    render(<PresenceDot onClick={() => {}} />);
    expect(screen.getByLabelText("AI agent active")).toBeInTheDocument();
  });

  it("is visible", () => {
    render(<PresenceDot onClick={() => {}} />);
    const dot = screen.getByLabelText("AI agent active");
    expect(dot).toBeVisible();
  });

  it("renders at viewport edge with fixed positioning", () => {
    render(<PresenceDot onClick={() => {}} />);
    const dot = screen.getByLabelText("AI agent active");
    expect(dot.style.position).toBe("fixed");
  });

  it("has button role", () => {
    render(<PresenceDot onClick={() => {}} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<PresenceDot onClick={handleClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
