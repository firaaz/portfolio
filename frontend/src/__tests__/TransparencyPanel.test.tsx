import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TransparencyPanel } from "../chrome/TransparencyPanel";
import { useAuditStore } from "../store/audit-store";
import { usePersonaStore } from "../store/persona-store";

afterEach(() => {
  cleanup();
  useAuditStore.setState({ activities: [] });
  usePersonaStore.setState({
    rationale: "",
    trust: 0,
    observations: [],
    inferenceDisabled: false,
  });
});

describe("TransparencyPanel", () => {
  it("has accessible heading", () => {
    render(<TransparencyPanel open onOpenChange={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /what the agent thinks of you/i }),
    ).toBeInTheDocument();
  });

  it("renders a decision activity's reasoning text", () => {
    useAuditStore.setState({
      activities: [
        {
          kind: "decision",
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

  it("renders a persona activity's rationale and trust", () => {
    useAuditStore.setState({
      activities: [
        {
          kind: "persona",
          rationale: "engineer evaluating tenancy",
          trust: 0.5,
          observation_count: 2,
          timestamp: "2026-04-03T10:01:00Z",
        },
      ],
    });
    render(<TransparencyPanel open onOpenChange={() => {}} />);
    expect(
      screen.getByText(/engineer evaluating tenancy/i),
    ).toBeInTheDocument();
  });

  it("renders a voice activity's content text", () => {
    useAuditStore.setState({
      activities: [
        {
          kind: "voice",
          voice_tag: "letter",
          utterance_kind: "letter",
          content: "Reading carefully — staying with this section.",
          timestamp: "2026-04-03T10:02:00Z",
        },
      ],
    });
    render(<TransparencyPanel open onOpenChange={() => {}} />);
    expect(
      screen.getByText(/reading carefully — staying with this section\./i),
    ).toBeInTheDocument();
  });

  it("renders the unified Activity section heading when activities present", () => {
    useAuditStore.setState({
      activities: [
        {
          kind: "voice",
          voice_tag: "whisper",
          utterance_kind: "observation",
          content: "noticed",
          timestamp: "2026-04-03T10:00:00Z",
        },
      ],
    });
    render(<TransparencyPanel open onOpenChange={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /activity/i }),
    ).toBeInTheDocument();
  });

  it("renders activity timestamps", () => {
    useAuditStore.setState({
      activities: [
        {
          kind: "decision",
          referrer_type: "direct",
          command: "show projects",
          changes: [],
          reasoning: "Command requested projects",
          timestamp: "2026-04-03T10:05:30Z",
        },
      ],
    });
    render(<TransparencyPanel open onOpenChange={() => {}} />);
    expect(screen.getByText(/:05/)).toBeInTheDocument();
  });
});
