import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MoleculeResolver } from "../molecules/MoleculeResolver";

afterEach(() => {
  cleanup();
});

describe("MoleculeResolver", () => {
  it("renders HeroMolecule for molecule='hero'", () => {
    render(
      <MoleculeResolver
        molecule="hero"
        data={{
          name: "Firaaz Farook",
          title: "Senior AI Engineer",
          subtitle: "AI Systems",
          summary: "Building production AI",
        }}
      />,
    );

    expect(screen.getByText("Firaaz Farook")).toBeInTheDocument();
    expect(
      screen.getByText("Senior AI Engineer · AI Systems"),
    ).toBeInTheDocument();
  });

  it("renders ProjectCard for molecule='project'", () => {
    render(
      <MoleculeResolver
        molecule="project"
        data={{
          title: "Salama AI",
          description: "Agentic platform",
          tech: ["Python"],
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Salama AI" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Agentic platform")).toBeInTheDocument();
  });

  it("renders ExperienceCard for molecule='experience'", () => {
    render(
      <MoleculeResolver
        molecule="experience"
        data={{
          company: "Deloitte",
          role: "Senior Consultant",
          duration: "4 years",
          description: "Led GenAI initiatives",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Deloitte" }),
    ).toBeInTheDocument();
  });

  it("renders fallback for unknown molecule type", () => {
    render(
      <MoleculeResolver molecule="unknown-type" data={{ title: "Mystery" }} />,
    );

    expect(screen.getByText("unknown-type")).toBeInTheDocument();
  });
});
