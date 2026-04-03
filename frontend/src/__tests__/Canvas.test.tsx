import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Canvas } from "../canvas/Canvas";
import { useManifestStore } from "../store/manifest-store";

afterEach(() => {
  useManifestStore.setState({ items: [] });
  cleanup();
});

describe("Canvas", () => {
  it("renders hero name and title when manifest has hero item", () => {
    useManifestStore.setState({
      items: [
        {
          id: "hero",
          importance: 1.0,
          molecule: "hero",
          data: { name: "Firaaz Farook", title: "Senior AI Engineer" },
        },
      ],
    });

    render(<Canvas onPresenceDotClick={() => {}} />);
    expect(screen.getByText("Firaaz Farook")).toBeInTheDocument();
    expect(screen.getByText("Senior AI Engineer")).toBeInTheDocument();
  });

  it("renders loading state when manifest is empty", () => {
    render(<Canvas onPresenceDotClick={() => {}} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders flow items via MoleculeResolver with opacity", () => {
    useManifestStore.setState({
      items: [
        {
          id: "hero",
          importance: 1.0,
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
          importance: 0.5,
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

  it("places items with importance >= 0.85 in hero zone", () => {
    useManifestStore.setState({
      items: [
        {
          id: "hero",
          importance: 1.0,
          molecule: "hero",
          data: {
            name: "Firaaz",
            title: "Engineer",
            subtitle: "AI",
            summary: "Building",
          },
        },
      ],
    });

    render(<Canvas onPresenceDotClick={() => {}} />);
    const heroZone = document.querySelector('[data-zone="hero"]');
    expect(heroZone).toBeInTheDocument();
    expect(heroZone).toHaveTextContent("Firaaz");
  });

  it("places items with importance 0.4–0.84 in flow zone", () => {
    useManifestStore.setState({
      items: [
        {
          id: "hero",
          importance: 1.0,
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
          importance: 0.7,
          molecule: "project",
          data: {
            title: "Salama AI",
            description: "Platform",
            tech: ["Python"],
          },
        },
        {
          id: "contact",
          importance: 0.6,
          molecule: "contact",
          data: { email: "test@example.com", cta: "Let's talk" },
        },
      ],
    });

    render(<Canvas onPresenceDotClick={() => {}} />);
    const flowZone = document.querySelector('[data-zone="flow"]');
    expect(flowZone).toBeInTheDocument();
    expect(flowZone).toHaveTextContent("Salama AI");
    expect(flowZone).toHaveTextContent("Let's talk");
  });

  it("places items with importance < 0.4 in background zone", () => {
    useManifestStore.setState({
      items: [
        {
          id: "hero",
          importance: 1.0,
          molecule: "hero",
          data: {
            name: "Firaaz",
            title: "Engineer",
            subtitle: "AI",
            summary: "Building",
          },
        },
        {
          id: "skill-python",
          importance: 0.3,
          molecule: "skill",
          data: { name: "Python" },
        },
        {
          id: "education-be",
          importance: 0.2,
          molecule: "education",
          data: { degree: "B.E. CS", institution: "UoP" },
        },
      ],
    });

    render(<Canvas onPresenceDotClick={() => {}} />);
    const bgZone = document.querySelector('[data-zone="background"]');
    expect(bgZone).toBeInTheDocument();
    expect(bgZone).toHaveTextContent("Python");
  });
});
