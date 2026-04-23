import { afterEach, describe, expect, it } from "vitest";
import { useUXStore } from "../store/ux-store";

afterEach(() => {
  useUXStore.setState({
    ux: { tempo: 0.5, agency: 0.5 },
    items: [],
    bridges: [],
  });
});

describe("intelligence extensions", () => {
  it("applyFocus updates importance and emphasis", () => {
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        {
          id: "project-salama",
          salience: 0.7,
          group: "work",
          molecule: "project",
          data: {},
        },
      ],
    });
    useUXStore
      .getState()
      .applyFocus("project-salama", 0.9, ["description", "tech"]);
    const item = useUXStore
      .getState()
      .items.find((i) => i.id === "project-salama");
    expect(item?.salience).toBe(0.9);
    expect(item?.emphasis).toEqual(["description", "tech"]);
  });

  it("applyRecede reduces importance", () => {
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        {
          id: "contact",
          salience: 0.6,
          group: "background",
          molecule: "contact",
          data: {},
        },
      ],
    });
    useUXStore.getState().applyRecede("contact", 0.3);
    const item = useUXStore.getState().items.find((i) => i.id === "contact");
    expect(item?.salience).toBe(0.3);
  });

  it("applySurface sets generated content", () => {
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        {
          id: "project-salama",
          salience: 0.7,
          group: "work",
          molecule: "project",
          data: {},
        },
      ],
    });
    useUXStore
      .getState()
      .applySurface("project-salama", { description: "Custom text." });
    const item = useUXStore
      .getState()
      .items.find((i) => i.id === "project-salama");
    expect(item?.generated).toEqual({ description: "Custom text." });
  });

  it("addBridge stores bridge annotation", () => {
    useUXStore
      .getState()
      .addBridge("project-salama", "experience-current", "Connected.");
    const bridges = useUXStore.getState().bridges;
    expect(bridges).toHaveLength(1);
    expect(bridges[0]?.text).toBe("Connected.");
  });

  it("bridges initializes empty", () => {
    expect(useUXStore.getState().bridges).toEqual([]);
  });
});
