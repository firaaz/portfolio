import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExperienceCard } from "../molecules/ExperienceCard";

afterEach(cleanup);

describe("ExperienceCard", () => {
  it("renders company, role, and duration in compact view", () => {
    render(
      <ExperienceCard
        company="Deloitte"
        role="Senior Consultant"
        duration="4 years"
        description="Led GenAI initiatives"
      />,
    );

    expect(screen.getByText("Deloitte")).toBeInTheDocument();
    expect(screen.getByText("Senior Consultant")).toBeInTheDocument();
    expect(screen.getByText("4 years")).toBeInTheDocument();
  });

  it("has accessible heading for role", () => {
    render(
      <ExperienceCard
        company="Emaratech"
        role="Senior Software Engineer"
        duration="Current"
        description="Building AI systems"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Senior Software Engineer" }),
    ).toBeInTheDocument();
  });

  it("hides description in breathing-extra slot", () => {
    const { container } = render(
      <ExperienceCard
        company="Co"
        role="Dev"
        duration="1y"
        description="Did things"
      />,
    );
    const extra = container.querySelector(".breathing-extra");
    expect(extra).toBeInTheDocument();
    expect(extra).toHaveClass("opacity-0");
    expect(extra).toHaveTextContent("Did things");
  });
});
