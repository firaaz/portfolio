import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EducationMolecule } from "../molecules/EducationMolecule";

afterEach(cleanup);

describe("EducationMolecule", () => {
  it("renders degree and institution", () => {
    render(
      <EducationMolecule
        degree="B.E. Computer Science"
        institution="University of Peradeniya"
      />,
    );
    expect(screen.getByText("B.E. Computer Science")).toBeInTheDocument();
    expect(screen.getByText("University of Peradeniya")).toBeInTheDocument();
  });
});
