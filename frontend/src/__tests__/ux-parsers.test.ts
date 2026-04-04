import { describe, expect, it } from "vitest";
import {
  isUXSnapshot,
  isUXSalience,
  isUXTempo,
  isUXAgency,
} from "../hooks/ux-parsers";

describe("isUXSnapshot", () => {
  it("matches valid snapshot", () => {
    const data = {
      type: "STATE_SNAPSHOT",
      snapshot: { ux: { tempo: 0.5, agency: 0.5 }, items: [] },
    };
    expect(isUXSnapshot(data)).toBe(true);
  });

  it("rejects old manifest snapshot", () => {
    const data = {
      type: "STATE_SNAPSHOT",
      snapshot: { manifest: { items: [] } },
    };
    expect(isUXSnapshot(data)).toBe(false);
  });

  it("rejects non-object", () => {
    expect(isUXSnapshot("hello")).toBe(false);
    expect(isUXSnapshot(null)).toBe(false);
  });
});

describe("isUXSalience", () => {
  it("matches salience event", () => {
    const data = {
      type: "CUSTOM",
      custom: { eventType: "ux:salience", items: [{ id: "hero", salience: 0.9 }] },
    };
    expect(isUXSalience(data)).toBe(true);
  });

  it("rejects decision event", () => {
    const data = {
      type: "CUSTOM",
      custom: { eventType: "DECISION" },
    };
    expect(isUXSalience(data)).toBe(false);
  });
});

describe("isUXTempo", () => {
  it("matches tempo event", () => {
    const data = { type: "CUSTOM", custom: { eventType: "ux:tempo", value: 0.7 } };
    expect(isUXTempo(data)).toBe(true);
  });
});

describe("isUXAgency", () => {
  it("matches agency event", () => {
    const data = { type: "CUSTOM", custom: { eventType: "ux:agency", value: 0.8 } };
    expect(isUXAgency(data)).toBe(true);
  });
});
