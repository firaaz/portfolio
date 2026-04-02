import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AnimatedMolecule } from "../canvas/AnimatedMolecule";

afterEach(() => {
  cleanup();
});

describe("AnimatedMolecule", () => {
  it("renders children", () => {
    render(
      <AnimatedMolecule importance={1.0}>
        <p>Hello</p>
      </AnimatedMolecule>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies opacity 1.0 for high importance", () => {
    render(
      <AnimatedMolecule importance={1.0}>
        <p>content</p>
      </AnimatedMolecule>,
    );
    const wrapper = screen.getByText("content").parentElement;
    expect(wrapper?.style.opacity).toBe("1");
  });

  it("applies opacity 0.55 for mid importance", () => {
    render(
      <AnimatedMolecule importance={0.6}>
        <p>content</p>
      </AnimatedMolecule>,
    );
    const wrapper = screen.getByText("content").parentElement;
    expect(wrapper?.style.opacity).toBe("0.55");
  });

  it("applies opacity 0.25 for low importance", () => {
    render(
      <AnimatedMolecule importance={0.2}>
        <p>content</p>
      </AnimatedMolecule>,
    );
    const wrapper = screen.getByText("content").parentElement;
    expect(wrapper?.style.opacity).toBe("0.25");
  });

  it("has transition CSS property for opacity", () => {
    render(
      <AnimatedMolecule importance={1.0}>
        <p>content</p>
      </AnimatedMolecule>,
    );
    const wrapper = screen.getByText("content").parentElement;
    expect(wrapper?.style.transition).toContain("opacity");
  });
});
