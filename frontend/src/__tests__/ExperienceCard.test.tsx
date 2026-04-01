import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExperienceCard } from "../molecules/ExperienceCard";

afterEach(() => {
  cleanup();
});

describe("ExperienceCard", () => {
  it("renders company, role, duration, and description", () => {
    const data = {
      company: "Deloitte",
      role: "Senior Consultant",
      duration: "4 years",
      description: "Led GenAI initiatives across enterprise clients",
    };
    render(<ExperienceCard {...data} />);

    expect(screen.getByText("Deloitte")).toBeInTheDocument();
    expect(screen.getByText("Senior Consultant")).toBeInTheDocument();
    expect(screen.getByText("4 years")).toBeInTheDocument();
    expect(
      screen.getByText("Led GenAI initiatives across enterprise clients"),
    ).toBeInTheDocument();
  });

  it("has an accessible heading for the company", () => {
    const data = {
      company: "Emaratech",
      role: "Senior Software Engineer",
      duration: "Current",
      description: "Building AI systems",
    };
    render(<ExperienceCard {...data} />);

    expect(
      screen.getByRole("heading", { name: "Emaratech" }),
    ).toBeInTheDocument();
  });
});
