import { afterEach, describe, expect, it } from "vitest";
import {
  addDecisionActivity,
  addPersonaActivity,
  addVoiceActivity,
  type DecisionActivity,
  getActivityCount,
  useAuditStore,
} from "../store/audit-store";

describe("audit-store — activities", () => {
  afterEach(() => {
    useAuditStore.setState({ activities: [] });
  });

  it("starts with empty activities", () => {
    const state = useAuditStore.getState();
    expect(state.activities).toEqual([]);
  });

  it("addDecisionActivity appends a kind=decision entry", () => {
    const decision: Omit<DecisionActivity, "kind"> = {
      referrer_type: "linkedin",
      command: null,
      changes: [{ item_id: "contact", direction: "elevated" }],
      reasoning: "Detected linkedin referrer — elevated contact",
      timestamp: "2026-04-26T10:00:00Z",
    };
    addDecisionActivity(decision);
    const activities = useAuditStore.getState().activities;
    expect(activities).toHaveLength(1);
    expect(activities[0]).toEqual({ kind: "decision", ...decision });
  });

  it("addPersonaActivity appends a kind=persona entry", () => {
    addPersonaActivity({
      rationale: "engineer evaluating",
      trust: 0.5,
      observation_count: 2,
      timestamp: "2026-04-26T10:01:00Z",
    });
    const [first] = useAuditStore.getState().activities;
    expect(first?.kind).toBe("persona");
    if (first?.kind === "persona") {
      expect(first.rationale).toBe("engineer evaluating");
      expect(first.trust).toBe(0.5);
      expect(first.observation_count).toBe(2);
    }
  });

  it("addVoiceActivity appends a kind=voice entry", () => {
    addVoiceActivity({
      voice_tag: "whisper",
      utterance_kind: "observation",
      content: "reading slowly here",
      timestamp: "2026-04-26T10:02:00Z",
    });
    const [first] = useAuditStore.getState().activities;
    expect(first?.kind).toBe("voice");
    if (first?.kind === "voice") {
      expect(first.voice_tag).toBe("whisper");
      expect(first.content).toBe("reading slowly here");
    }
  });

  it("activities are ordered newest-first across mixed kinds", () => {
    addDecisionActivity({
      referrer_type: "linkedin",
      command: null,
      changes: [],
      reasoning: "first",
      timestamp: "2026-04-26T10:00:00Z",
    });
    addPersonaActivity({
      rationale: "second",
      trust: 0.4,
      observation_count: 1,
      timestamp: "2026-04-26T10:01:00Z",
    });
    addVoiceActivity({
      voice_tag: "letter",
      utterance_kind: "letter",
      content: "third",
      timestamp: "2026-04-26T10:02:00Z",
    });
    const activities = useAuditStore.getState().activities;
    expect(activities.map((a) => a.kind)).toEqual([
      "voice",
      "persona",
      "decision",
    ]);
  });

  it("getActivityCount returns the total entry count", () => {
    expect(getActivityCount(useAuditStore.getState())).toBe(0);
    addDecisionActivity({
      referrer_type: "direct",
      command: "show projects",
      changes: [],
      reasoning: "one",
      timestamp: "2026-04-26T10:00:00Z",
    });
    addPersonaActivity({
      rationale: "two",
      trust: 0.4,
      observation_count: 1,
      timestamp: "2026-04-26T10:01:00Z",
    });
    expect(getActivityCount(useAuditStore.getState())).toBe(2);
  });
});
