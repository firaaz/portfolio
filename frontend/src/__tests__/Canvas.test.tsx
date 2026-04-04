import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Canvas } from "../canvas/Canvas";
import { useUXStore } from "../store/ux-store";

afterEach(() => {
  useUXStore.setState({ items: [], ux: { tempo: 0.5, agency: 0.5 } });
  cleanup();
});

const FULL_ITEMS = [
  {
    id: "hero",
    salience: 1.0,
    group: "identity",
    molecule: "hero",
    data: {
      name: "Firaaz Farook",
      title: "Senior Software Engineer",
      subtitle: "AI Systems",
      summary: "Building production AI",
    },
  },
  {
    id: "p1",
    salience: 0.8,
    group: "work",
    molecule: "project",
    data: {
      title: "Salama AI",
      description: "Agentic platform",
      tech: ["Python"],
    },
  },
  {
    id: "p2",
    salience: 0.6,
    group: "work",
    molecule: "project",
    data: {
      title: "GenAI Migration",
      description: "Code migration",
      tech: ["LLMs"],
    },
  },
  {
    id: "exp1",
    salience: 0.7,
    group: "work",
    molecule: "experience",
    data: {
      company: "Deloitte",
      role: "Senior Consultant",
      duration: "4 years",
      description: "Led GenAI",
    },
  },
  {
    id: "contact",
    salience: 0.5,
    group: "background",
    molecule: "contact",
    data: { email: "test@example.com", cta: "Talk" },
  },
  {
    id: "skill-py",
    salience: 0.3,
    group: "background",
    molecule: "skill",
    data: { name: "Python" },
  },
];

describe("Canvas", () => {
  it("renders loading state when store is empty", () => {
    render(<Canvas onPresenceDotClick={() => {}} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders content zones with data-zone attributes", () => {
    useUXStore.setState({ items: FULL_ITEMS });
    render(<Canvas onPresenceDotClick={() => {}} />);

    expect(
      document.querySelector('[data-zone="identity"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-zone="featured"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-zone="experience"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-zone="other-work"]'),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-zone="skills"]')).toBeInTheDocument();
    expect(document.querySelector('[data-zone="contact"]')).toBeInTheDocument();
    expect(
      document.querySelector('[data-zone="education"]'),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-zone="command"]')).toBeInTheDocument();
  });

  it("places highest-salience project in featured zone", () => {
    useUXStore.setState({ items: FULL_ITEMS });
    render(<Canvas onPresenceDotClick={() => {}} />);

    const featured = document.querySelector('[data-zone="featured"]');
    expect(featured).toHaveTextContent("Salama AI");

    const otherWork = document.querySelector('[data-zone="other-work"]');
    expect(otherWork).toHaveTextContent("GenAI Migration");
  });

  it("applies salience as opacity style", () => {
    useUXStore.setState({ items: FULL_ITEMS });
    render(<Canvas onPresenceDotClick={() => {}} />);

    const heading = screen.getByRole("heading", { name: "Salama AI" });
    const wrapper = heading.closest("[style]");
    expect(wrapper).toHaveStyle({ opacity: "0.8" });
  });

  it("renders command zone with keyboard hint", () => {
    useUXStore.setState({ items: FULL_ITEMS });
    render(<Canvas onPresenceDotClick={() => {}} />);

    const command = document.querySelector('[data-zone="command"]');
    expect(command).toHaveTextContent("⌘K");
    expect(command).toHaveTextContent("Ask me anything");
  });
});
