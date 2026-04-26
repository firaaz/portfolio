import { afterEach, describe, expect, it } from "vitest";
import {
  applyPersonaDelta,
  type PersonaObservation,
  setInferenceDisabled,
  usePersonaStore,
} from "../store/persona-store";

const baseObs = (
  over: Partial<PersonaObservation> = {},
): PersonaObservation => ({
  dimension: "role",
  value: "engineer",
  confidence: 0.6,
  rationale: "dwell on tenancy",
  source_signals: [{ kind: "signal", id: "s0" }],
  ts: "2026-04-26T12:00:00Z",
  ...over,
});

afterEach(() => {
  usePersonaStore.setState({
    rationale: "",
    trust: 0,
    observations: [],
    inferenceDisabled: false,
  });
});

describe("usePersonaStore", () => {
  it("starts empty with zero trust", () => {
    const s = usePersonaStore.getState();
    expect(s.rationale).toBe("");
    expect(s.trust).toBe(0);
    expect(s.observations).toEqual([]);
  });

  it("applies a delta with rationale and trust", () => {
    applyPersonaDelta({
      rationale: "linkedin engineer",
      trust: 0.5,
      observations_added: [baseObs()],
    });
    const s = usePersonaStore.getState();
    expect(s.rationale).toBe("linkedin engineer");
    expect(s.trust).toBe(0.5);
    expect(s.observations).toHaveLength(1);
  });

  it("appends observations across deltas (append-only)", () => {
    applyPersonaDelta({ observations_added: [baseObs({ value: "engineer" })] });
    applyPersonaDelta({
      observations_added: [baseObs({ value: "recruiter", confidence: 0.4 })],
    });
    const s = usePersonaStore.getState();
    expect(s.observations.map((o) => o.value)).toEqual([
      "engineer",
      "recruiter",
    ]);
  });

  it("preserves prior trust when delta omits it", () => {
    applyPersonaDelta({ trust: 0.5, observations_added: [baseObs()] });
    applyPersonaDelta({ observations_added: [baseObs({ value: "founder" })] });
    expect(usePersonaStore.getState().trust).toBe(0.5);
  });

  it("preserves prior rationale when delta omits it", () => {
    applyPersonaDelta({
      rationale: "first read",
      observations_added: [baseObs()],
    });
    applyPersonaDelta({ observations_added: [baseObs({ value: "founder" })] });
    expect(usePersonaStore.getState().rationale).toBe("first read");
  });

  it("starts with inferenceDisabled = false", () => {
    expect(usePersonaStore.getState().inferenceDisabled).toBe(false);
  });

  it("setInferenceDisabled(true) flips the flag on", () => {
    setInferenceDisabled(true);
    expect(usePersonaStore.getState().inferenceDisabled).toBe(true);
  });

  it("setInferenceDisabled(false) flips the flag off", () => {
    setInferenceDisabled(true);
    setInferenceDisabled(false);
    expect(usePersonaStore.getState().inferenceDisabled).toBe(false);
  });

  it("setInferenceDisabled does not clobber observations or trust", () => {
    applyPersonaDelta({
      rationale: "linkedin engineer",
      trust: 0.5,
      observations_added: [baseObs()],
    });
    setInferenceDisabled(true);
    const s = usePersonaStore.getState();
    expect(s.rationale).toBe("linkedin engineer");
    expect(s.trust).toBe(0.5);
    expect(s.observations).toHaveLength(1);
  });
});
