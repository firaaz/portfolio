import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContactCard } from "../molecules/ContactCard";

afterEach(cleanup);

describe("ContactCard", () => {
  it("renders email link", () => {
    render(<ContactCard email="firaaz@example.com" cta="Let's talk" />);
    const links = screen.getAllByRole("link");
    const emailLink = links.find((l) => l.textContent === "firaaz@example.com");
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute("href", "mailto:firaaz@example.com");
  });

  it("renders CTA as primary button link", () => {
    render(<ContactCard email="firaaz@example.com" cta="Get in touch" />);
    const cta = screen.getByRole("link", { name: /get in touch/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "mailto:firaaz@example.com");
  });
});
