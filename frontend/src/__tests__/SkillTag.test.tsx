import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SkillTag } from "../molecules/SkillTag";

afterEach(cleanup);

describe("SkillTag", () => {
  it("renders skill name", () => {
    render(<SkillTag name="TypeScript" />);
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("renders as tag chip without dot prefix", () => {
    const { container } = render(<SkillTag name="Python" />);
    expect(container.querySelector("[aria-hidden]")).toBeNull();
    expect(container.firstElementChild!.className).toContain("uppercase");
  });
});
