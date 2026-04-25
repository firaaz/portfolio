import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TransparencyPanel } from "../chrome/TransparencyPanel";
import { useAuditStore } from "../store/audit-store";
import { usePersonaStore } from "../store/persona-store";

afterEach(() => {
  cleanup();
  useAuditStore.setState({ decisions: [] });
  usePersonaStore.setState({ rationale: "", trust: 0, observations: [] });
});

describe("TransparencyPanel", () => {
  it("has accessible heading", () => {
    render(<TransparencyPanel open onOpenChange={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /what the agent thinks of you/i }),
    ).toBeInTheDocument();
  });

  it("renders decisions with reasoning text", () => {
    useAuditStore.setState({
      decisions: [
        {
          referrer_type: "linkedin",
          command: null,
          changes: [{ item_id: "contact", direction: "elevated" }],
          reasoning: "Detected linkedin referrer — elevated contact",
          timestamp: "2026-04-03T10:00:00Z",
        },
      ],
    });
    render(<TransparencyPanel open onOpenChange={() => {}} />);
    expect(
      screen.getByText("Detected linkedin referrer — elevated contact"),
    ).toBeInTheDocument();
  });

  it("renders timestamps", () => {
    useAuditStore.setState({
      decisions: [
        {
          referrer_type: "direct",
          command: "show projects",
          changes: [],
          reasoning: "Command requested projects",
          timestamp: "2026-04-03T10:05:30Z",
        },
      ],
    });
    render(<TransparencyPanel open onOpenChange={() => {}} />);
    // Should render some form of the time (timezone-dependent)
    expect(screen.getByText(/:05/)).toBeInTheDocument();
  });
});
