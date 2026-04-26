import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Bento } from "../canvas/Bento";
import type { UXItem } from "../store/ux-store";
import { useUXStore } from "../store/ux-store";

function makeItem(
  id: string,
  salience: number,
  molecule: string = "project",
): UXItem {
  return {
    id,
    salience,
    group: "work",
    molecule,
    data: { title: id, description: `content for ${id}` },
  };
}

describe("Bento — rendering", () => {
  afterEach(() => {
    useUXStore.setState({ items: [], bridges: [] });
    cleanup();
  });

  it("given no items, renders nothing in the grid", () => {
    render(<Bento items={[]} />);
    const grid = screen.getByRole("region", { name: /content/i });
    expect(grid.children.length).toBe(0);
  });

  it("given items, renders one card per non-hidden entry", () => {
    const items = [makeItem("a", 0.9), makeItem("b", 0.5), makeItem("c", 0.2)];
    render(<Bento items={items} />);
    expect(screen.getByTestId("bento-card-a")).toBeInTheDocument();
    expect(screen.getByTestId("bento-card-b")).toBeInTheDocument();
    expect(screen.getByTestId("bento-card-c")).toBeInTheDocument();
  });

  it("given a tier-5 item, applies span 4/span 3 styles", () => {
    render(<Bento items={[makeItem("hero", 0.9)]} />);
    const card = screen.getByTestId("bento-card-hero");
    const style = card.getAttribute("style") ?? "";
    expect(style).toMatch(/grid-column:\s*span\s*4/);
    expect(style).toMatch(/grid-row:\s*span\s*3/);
  });

  it("given a hidden item (salience < 0.15), sets aria-hidden", () => {
    render(<Bento items={[makeItem("tiny", 0.05)]} />);
    const card = screen.getByTestId("bento-card-tiny");
    expect(card).toHaveAttribute("aria-hidden", "true");
  });

  it("borders highlighted cards when given the highlighted prop", () => {
    const items = [makeItem("hero", 0.9), makeItem("other", 0.5)];
    render(<Bento items={items} highlighted={["hero"]} />);
    expect(screen.getByTestId("bento-card-hero")).toHaveAttribute(
      "data-highlighted",
      "true",
    );
    expect(screen.getByTestId("bento-card-other")).not.toHaveAttribute(
      "data-highlighted",
    );
  });
});

describe("Bento — BDD: agent cascade", () => {
  afterEach(() => {
    useUXStore.setState({ items: [], bridges: [] });
    cleanup();
  });

  it("given a LinkedIn cascade, when ux:focus raises contact salience to 0.7, then contact renders at tier 4 (larger than default)", () => {
    const items = [
      makeItem("contact-email", 0.7, "contact"),
      makeItem("project-x", 0.3, "project"),
    ];
    render(<Bento items={items} />);
    const contactCard = screen.getByTestId("bento-card-contact-email");
    const projectCard = screen.getByTestId("bento-card-project-x");
    const contactCells =
      Number(contactCard.style.gridColumn.match(/\d+/)?.[0] ?? 0) *
      Number(contactCard.style.gridRow.match(/\d+/)?.[0] ?? 0);
    const projectCells =
      Number(projectCard.style.gridColumn.match(/\d+/)?.[0] ?? 0) *
      Number(projectCard.style.gridRow.match(/\d+/)?.[0] ?? 0);
    expect(contactCells).toBeGreaterThan(projectCells);
  });
});
