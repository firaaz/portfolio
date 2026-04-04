import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExperienceCard } from "../molecules/ExperienceCard";

afterEach(cleanup);

const DATA = {
  company: "Deloitte",
  role: "Senior Consultant",
  duration: "4 years",
  description: "Led GenAI initiatives",
};

describe("ExperienceCard", () => {
  it("renders company, role, and duration in compact view", () => {
    render(<ExperienceCard {...DATA} />);

    expect(screen.getByText("Deloitte")).toBeInTheDocument();
    expect(screen.getByText("Senior Consultant")).toBeInTheDocument();
    expect(screen.getByText("4 years")).toBeInTheDocument();
  });

  it("has accessible heading for role", () => {
    const emaratech = {
      ...DATA,
      company: "Emaratech",
      role: "Senior Software Engineer",
      duration: "Current",
      description: "Building AI systems",
    };
    render(<ExperienceCard {...emaratech} />);

    expect(
      screen.getByRole("heading", { name: "Senior Software Engineer" }),
    ).toBeInTheDocument();
  });

  it("hides description in breathing-extra slot", () => {
    const { container } = render(<ExperienceCard {...DATA} />);
    const extra = container.querySelector(".breathing-extra");
    expect(extra).toBeInTheDocument();
    expect(extra).toHaveClass("opacity-0");
    expect(extra).toHaveTextContent("Led GenAI initiatives");
  });
});
