import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App";

afterEach(cleanup);

describe("App", () => {
  it("mounts without error", () => {
    render(<App />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
