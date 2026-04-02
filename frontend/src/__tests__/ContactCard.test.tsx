import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContactCard } from "../molecules/ContactCard";

afterEach(() => {
  cleanup();
});

describe("ContactCard", () => {
  it("renders an email link", () => {
    render(<ContactCard email="firaaz@example.com" cta="Let's talk" />);

    const link = screen.getByRole("link", { name: /firaaz@example.com/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "mailto:firaaz@example.com");
  });

  it("renders a CTA button with accessible label", () => {
    render(<ContactCard email="firaaz@example.com" cta="Get in touch" />);

    const button = screen.getByRole("link", { name: /get in touch/i });
    expect(button).toBeInTheDocument();
  });
});
