import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TransparencyPanel } from "../chrome/TransparencyPanel";
import { useAuditStore } from "../store/audit-store";

afterEach(() => {
  cleanup();
  useAuditStore.setState({ decisions: [] });
});

describe("TransparencyPanel", () => {
  it("shows empty state when no decisions", () => {
    render(<TransparencyPanel open onOpenChange={() => {}} />);
    expect(screen.getByText("No decisions yet")).toBeInTheDocument();
  });

  it("has accessible heading", () => {
    render(<TransparencyPanel open onOpenChange={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /agent decisions/i }),
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
