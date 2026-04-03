import { describe, expect, it } from "vitest";
import {
  isDecisionEvent,
  isStateDelta,
  isStateSnapshot,
} from "../hooks/sse-parsers";

describe("sse-parsers", () => {
  describe("isStateSnapshot", () => {
    it("returns true for valid snapshot", () => {
      expect(
        isStateSnapshot({
          type: "STATE_SNAPSHOT",
          snapshot: { manifest: { items: [] } },
        }),
      ).toBe(true);
    });

    it("returns false for delta", () => {
      expect(
        isStateSnapshot({
          type: "STATE_DELTA",
          delta: { updates: [] },
        }),
      ).toBe(false);
    });
  });

  describe("isStateDelta", () => {
    it("returns true for valid delta", () => {
      expect(
        isStateDelta({
          type: "STATE_DELTA",
          delta: { updates: [] },
        }),
      ).toBe(true);
    });
  });

  describe("isDecisionEvent", () => {
    it("returns true for CUSTOM DECISION event", () => {
      expect(
        isDecisionEvent({
          type: "CUSTOM",
          custom: {
            eventType: "DECISION",
            decision: {
              referrer_type: "linkedin",
              command: null,
              changes: [],
              reasoning: "Detected linkedin referrer",
            },
          },
        }),
      ).toBe(true);
    });

    it("returns false for STATE_SNAPSHOT", () => {
      expect(
        isDecisionEvent({
          type: "STATE_SNAPSHOT",
          snapshot: { manifest: { items: [] } },
        }),
      ).toBe(false);
    });

    it("returns false for CUSTOM with different eventType", () => {
      expect(
        isDecisionEvent({
          type: "CUSTOM",
          custom: { eventType: "OTHER", data: {} },
        }),
      ).toBe(false);
    });

    it("returns false for null", () => {
      expect(isDecisionEvent(null)).toBe(false);
    });
  });
});
