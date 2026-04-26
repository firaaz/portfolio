import { afterEach, describe, expect, it } from "vitest";
import { peakSalienceGroup, useUXStore } from "../store/ux-store";

afterEach(() => {
  useUXStore.setState({
    ux: { tempo: 0.5, agency: 0.5 },
    items: [],
  });
});

describe("useUXStore", () => {
  it("initializes with default globals", () => {
    const state = useUXStore.getState();
    expect(state.ux.tempo).toBe(0.5);
    expect(state.ux.agency).toBe(0.5);
    expect(state.items).toEqual([]);
  });

  it("setSnapshot replaces full state", () => {
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.3, agency: 0.7 },
      items: [
        {
          id: "hero",
          salience: 0.95,
          group: "identity",
          molecule: "hero",
          data: { name: "F" },
        },
      ],
    });
    const state = useUXStore.getState();
    expect(state.ux.tempo).toBe(0.3);
    expect(state.items).toHaveLength(1);
    const firstItem = state.items[0];
    expect(firstItem?.salience).toBe(0.95);
  });

  it("applySalience updates item salience", () => {
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        {
          id: "hero",
          salience: 0.95,
          group: "identity",
          molecule: "hero",
          data: {},
        },
        {
          id: "contact",
          salience: 0.6,
          group: "background",
          molecule: "contact",
          data: {},
        },
      ],
    });
    useUXStore.getState().applySalience([{ id: "contact", salience: 0.85 }]);
    const contact = useUXStore.getState().items.find((i) => i.id === "contact");
    expect(contact?.salience).toBe(0.85);
  });

  it("setTempo updates tempo", () => {
    useUXStore.getState().setTempo(0.8);
    expect(useUXStore.getState().ux.tempo).toBe(0.8);
  });

  it("setAgency updates agency", () => {
    useUXStore.getState().setAgency(0.3);
    expect(useUXStore.getState().ux.agency).toBe(0.3);
  });

  it("setSnapshot preserves salience and emphasis adapted by applyFocus", () => {
    const baseline = {
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        {
          id: "a",
          salience: 0.3,
          group: "work",
          molecule: "project",
          data: {},
        },
        {
          id: "b",
          salience: 0.3,
          group: "work",
          molecule: "project",
          data: {},
        },
      ],
    };
    useUXStore.getState().setSnapshot(baseline);
    useUXStore.getState().applyFocus("a", 0.9, ["highlight"]);
    useUXStore.getState().setSnapshot(baseline);
    const a = useUXStore.getState().items.find((i) => i.id === "a");
    expect(a?.salience).toBe(0.9);
    expect(a?.emphasis).toEqual(["highlight"]);
  });

  it("setSnapshot preserves generated copy adapted by applySurface", () => {
    const baseline = {
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        {
          id: "a",
          salience: 0.3,
          group: "work",
          molecule: "project",
          data: {},
        },
      ],
    };
    useUXStore.getState().setSnapshot(baseline);
    useUXStore.getState().applySurface("a", { headline: "Re-tuned headline" });
    useUXStore.getState().setSnapshot(baseline);
    const a = useUXStore.getState().items.find((i) => i.id === "a");
    expect(a?.generated).toEqual({ headline: "Re-tuned headline" });
  });

  it("setSnapshot drops items absent from the new snapshot", () => {
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        {
          id: "a",
          salience: 0.3,
          group: "work",
          molecule: "project",
          data: {},
        },
        {
          id: "b",
          salience: 0.3,
          group: "work",
          molecule: "project",
          data: {},
        },
      ],
    });
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        {
          id: "a",
          salience: 0.3,
          group: "work",
          molecule: "project",
          data: {},
        },
      ],
    });
    const ids = useUXStore.getState().items.map((i) => i.id);
    expect(ids).toEqual(["a"]);
  });

  it("setSnapshot updates server-authoritative fields for existing items", () => {
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        {
          id: "a",
          salience: 0.3,
          group: "old",
          molecule: "m",
          data: { v: 1 },
        },
      ],
    });
    useUXStore.getState().applyFocus("a", 0.9, []);
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        {
          id: "a",
          salience: 0.5,
          group: "new",
          molecule: "m2",
          data: { v: 2 },
        },
      ],
    });
    const a = useUXStore.getState().items.find((i) => i.id === "a");
    expect(a?.salience).toBe(0.9);
    expect(a?.group).toBe("new");
    expect(a?.molecule).toBe("m2");
    expect(a?.data).toEqual({ v: 2 });
  });
});

describe("peakSalienceGroup", () => {
  it("returns group with highest salience item", () => {
    useUXStore.setState({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        {
          id: "hero",
          salience: 0.95,
          group: "identity",
          molecule: "hero",
          data: {},
        },
        {
          id: "project",
          salience: 0.85,
          group: "work",
          molecule: "project",
          data: {},
        },
      ],
    });
    expect(peakSalienceGroup(useUXStore.getState())).toBe("identity");
  });

  it("returns undefined for empty items", () => {
    expect(peakSalienceGroup(useUXStore.getState())).toBeUndefined();
  });
});
