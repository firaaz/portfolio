import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TransparencyPanel } from "../chrome/TransparencyPanel";
import { usePersonaStore } from "../store/persona-store";

afterEach(() => {
  cleanup();
  usePersonaStore.setState({
    rationale: "",
    trust: 0,
    observations: [],
    inferenceDisabled: false,
  });
});

describe("TransparencyPanel persona section", () => {
  it("shows an empty-persona message when no observations", () => {
    render(<TransparencyPanel open={true} onOpenChange={() => {}} />);
    expect(
      screen.getByText(/agent has not formed a read/i),
    ).toBeInTheDocument();
  });

  it("renders rationale, trust and observations from the store", () => {
    usePersonaStore.setState({
      rationale: "LinkedIn visitor reading architecture",
      trust: 0.5,
      observations: [
        {
          dimension: "role",
          value: "engineer",
          confidence: 0.6,
          rationale: "dwell on tenancy",
          source_signals: [{ kind: "signal", id: "s0" }],
          ts: "2026-04-26T12:00:00Z",
        },
        {
          dimension: "role",
          value: "recruiter",
          confidence: 0.4,
          rationale: "linkedin referrer",
          source_signals: [{ kind: "signal", id: "s1" }],
          ts: "2026-04-26T12:00:00Z",
        },
      ],
    });
    render(<TransparencyPanel open={true} onOpenChange={() => {}} />);
    expect(
      screen.getByText(/linkedin visitor reading architecture/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/trust/i)).toBeInTheDocument();
    expect(screen.getByText(/0\.50/)).toBeInTheDocument();
    expect(screen.getByText(/engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/recruiter/i)).toBeInTheDocument();
  });
});

describe("TransparencyPanel — do-not-infer toggle", () => {
  it("renders an unchecked checkbox labeled 'Do not infer my persona'", () => {
    render(<TransparencyPanel open={true} onOpenChange={() => {}} />);
    const toggle = screen.getByRole("checkbox", {
      name: /do not infer my persona/i,
    });
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
  });

  it("reflects the current store state on first render when flag is true", () => {
    usePersonaStore.setState({ inferenceDisabled: true });
    render(<TransparencyPanel open={true} onOpenChange={() => {}} />);
    expect(
      screen.getByRole("checkbox", { name: /do not infer my persona/i }),
    ).toBeChecked();
  });

  it("clicking flips inferenceDisabled in the store from false to true", () => {
    render(<TransparencyPanel open={true} onOpenChange={() => {}} />);
    const toggle = screen.getByRole("checkbox", {
      name: /do not infer my persona/i,
    });
    fireEvent.click(toggle);
    expect(usePersonaStore.getState().inferenceDisabled).toBe(true);
  });

  it("clicking again flips it back to false", () => {
    usePersonaStore.setState({ inferenceDisabled: true });
    render(<TransparencyPanel open={true} onOpenChange={() => {}} />);
    const toggle = screen.getByRole("checkbox", {
      name: /do not infer my persona/i,
    });
    fireEvent.click(toggle);
    expect(usePersonaStore.getState().inferenceDisabled).toBe(false);
  });
});
