import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Canvas } from "../canvas/Canvas";
import { useUXStore } from "../store/ux-store";

afterEach(() => {
  useUXStore.setState({ items: [], ux: { tempo: 0.5, agency: 0.5 } });
  cleanup();
});

describe("Canvas", () => {
  it("renders hero name and title when store has hero item", () => {
    useUXStore.setState({
      items: [
        {
          id: "hero",
          salience: 1.0,
          group: "hero",
          molecule: "hero",
          data: { name: "Firaaz Farook", title: "Senior AI Engineer" },
        },
      ],
    });

    render(<Canvas onPresenceDotClick={() => {}} />);
    expect(screen.getByText("Firaaz Farook")).toBeInTheDocument();
    expect(screen.getByText("Senior AI Engineer")).toBeInTheDocument();
  });

  it("renders loading state when store is empty", () => {
    render(<Canvas onPresenceDotClick={() => {}} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders items via MoleculeResolver with opacity from salience", () => {
    useUXStore.setState({
      items: [
        {
          id: "hero",
          salience: 1.0,
          group: "hero",
          molecule: "hero",
          data: {
            name: "Firaaz Farook",
            title: "Senior AI Engineer",
            subtitle: "AI",
            summary: "Building AI",
          },
        },
        {
          id: "proj",
          salience: 0.7,
          group: "work",
          molecule: "project",
          data: {
            title: "Salama AI",
            description: "Agentic platform",
            tech: ["Python"],
          },
        },
      ],
    });

    render(<Canvas onPresenceDotClick={() => {}} />);
    expect(
      screen.getByRole("heading", { name: "Salama AI" }),
    ).toBeInTheDocument();
  });

  it("groups items into data-zone sections by group", () => {
    useUXStore.setState({
      items: [
        {
          id: "hero",
          salience: 1.0,
          group: "hero",
          molecule: "hero",
          data: {
            name: "Firaaz",
            title: "Engineer",
            subtitle: "AI",
            summary: "Building",
          },
        },
        {
          id: "proj",
          salience: 0.7,
          group: "work",
          molecule: "project",
          data: {
            title: "Salama AI",
            description: "Platform",
            tech: ["Python"],
          },
        },
        {
          id: "contact",
          salience: 0.6,
          group: "work",
          molecule: "contact",
          data: { email: "test@example.com", cta: "Let's talk" },
        },
      ],
    });

    render(<Canvas onPresenceDotClick={() => {}} />);
    const heroZone = document.querySelector('[data-zone="hero"]');
    const workZone = document.querySelector('[data-zone="work"]');
    expect(heroZone).toBeInTheDocument();
    expect(heroZone).toHaveTextContent("Firaaz");
    expect(workZone).toBeInTheDocument();
    expect(workZone).toHaveTextContent("Salama AI");
    expect(workZone).toHaveTextContent("Let's talk");
  });

  it("applies salience as opacity style", () => {
    useUXStore.setState({
      items: [
        {
          id: "proj",
          salience: 0.6,
          group: "work",
          molecule: "project",
          data: {
            title: "Salama AI",
            description: "Platform",
            tech: ["Python"],
          },
        },
      ],
    });

    render(<Canvas onPresenceDotClick={() => {}} />);
    const heading = screen.getByRole("heading", { name: "Salama AI" });
    const wrapper = heading.closest("[style]");
    expect(wrapper).toHaveStyle({ opacity: "0.6" });
  });
});
