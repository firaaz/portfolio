import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectCard } from "../molecules/ProjectCard";

afterEach(() => {
  cleanup();
});

describe("ProjectCard", () => {
  it("renders title, description, and tech tags", () => {
    render(
      <ProjectCard
        title="Salama AI Platform"
        description="LangGraph-powered agentic platform"
        tech={["LangGraph", "Python", "FastAPI"]}
      />,
    );

    expect(screen.getByText("Salama AI Platform")).toBeInTheDocument();
    expect(
      screen.getByText("LangGraph-powered agentic platform"),
    ).toBeInTheDocument();
    expect(screen.getByText("LangGraph")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("FastAPI")).toBeInTheDocument();
  });

  it("has an accessible heading", () => {
    render(
      <ProjectCard
        title="GenAI Migration"
        description="Code migration using LLMs"
        tech={["Python"]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "GenAI Migration" }),
    ).toBeInTheDocument();
  });
});
