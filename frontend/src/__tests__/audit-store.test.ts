import { afterEach, describe, expect, it } from "vitest";
import {
  type DecisionRecord,
  getDecisionCount,
  useAuditStore,
} from "../store/audit-store";

describe("audit-store", () => {
  afterEach(() => {
    useAuditStore.setState({ decisions: [] });
  });

  it("starts with empty decisions", () => {
    const state = useAuditStore.getState();
    expect(state.decisions).toEqual([]);
  });

  it("addDecision appends a decision", () => {
    const decision: DecisionRecord = {
      referrer_type: "linkedin",
      command: null,
      changes: [{ item_id: "contact", direction: "elevated" }],
      reasoning: "Detected linkedin referrer — elevated contact",
      timestamp: "2026-04-03T10:00:00Z",
    };
    useAuditStore.getState().addDecision(decision);
    expect(useAuditStore.getState().decisions).toHaveLength(1);
    expect(useAuditStore.getState().decisions[0]).toEqual(decision);
  });

  it("decisions are ordered newest-first", () => {
    const first: DecisionRecord = {
      referrer_type: "linkedin",
      command: null,
      changes: [],
      reasoning: "First decision",
      timestamp: "2026-04-03T10:00:00Z",
    };
    const second: DecisionRecord = {
      referrer_type: "github",
      command: null,
      changes: [],
      reasoning: "Second decision",
      timestamp: "2026-04-03T10:01:00Z",
    };
    useAuditStore.getState().addDecision(first);
    useAuditStore.getState().addDecision(second);
    const decisions = useAuditStore.getState().decisions;
    expect(decisions[0]?.reasoning).toBe("Second decision");
    expect(decisions[1]?.reasoning).toBe("First decision");
  });

  it("getDecisionCount returns correct count", () => {
    expect(getDecisionCount(useAuditStore.getState())).toBe(0);
    useAuditStore.getState().addDecision({
      referrer_type: "direct",
      command: "show projects",
      changes: [],
      reasoning: "Command requested projects",
      timestamp: "2026-04-03T10:00:00Z",
    });
    expect(getDecisionCount(useAuditStore.getState())).toBe(1);
  });
});
