import { describe, expect, it } from "vitest";
import { mapItemsToZones } from "../canvas/zone-map";
import type { UXItem } from "../store/ux-store";

function item(overrides: Partial<UXItem> & { id: string }): UXItem {
  return {
    salience: 0.5,
    group: "work",
    molecule: "project",
    data: {},
    ...overrides,
  };
}

describe("mapItemsToZones", () => {
  it("maps identity group to identity zone", () => {
    const items = [item({ id: "hero", group: "identity", molecule: "hero" })];
    const zones = mapItemsToZones(items);
    expect(zones.get("identity")).toHaveLength(1);
    expect(zones.get("identity")![0]!.id).toBe("hero");
  });

  it("maps highest-salience project to featured zone", () => {
    const items = [
      item({ id: "p1", salience: 0.8, group: "work", molecule: "project" }),
      item({ id: "p2", salience: 0.6, group: "work", molecule: "project" }),
    ];
    const zones = mapItemsToZones(items);
    expect(zones.get("featured")).toHaveLength(1);
    expect(zones.get("featured")![0]!.id).toBe("p1");
    expect(zones.get("other-work")).toHaveLength(1);
    expect(zones.get("other-work")![0]!.id).toBe("p2");
  });

  it("maps work experiences to experience zone", () => {
    const items = [
      item({ id: "e1", group: "work", molecule: "experience" }),
      item({ id: "e2", group: "work", molecule: "experience" }),
    ];
    const zones = mapItemsToZones(items);
    expect(zones.get("experience")).toHaveLength(2);
  });

  it("maps background molecules to correct zones", () => {
    const items = [
      item({ id: "c1", group: "background", molecule: "contact" }),
      item({ id: "s1", group: "background", molecule: "skill" }),
      item({ id: "s2", group: "background", molecule: "skill" }),
      item({ id: "ed1", group: "background", molecule: "education" }),
    ];
    const zones = mapItemsToZones(items);
    expect(zones.get("contact")).toHaveLength(1);
    expect(zones.get("skills")).toHaveLength(2);
    expect(zones.get("education")).toHaveLength(1);
  });

  it("returns empty map for empty items", () => {
    const zones = mapItemsToZones([]);
    expect(zones.size).toBe(0);
  });

  it("handles single project as featured (no other-work)", () => {
    const items = [
      item({ id: "p1", salience: 0.8, group: "work", molecule: "project" }),
    ];
    const zones = mapItemsToZones(items);
    expect(zones.get("featured")).toHaveLength(1);
    expect(zones.has("other-work")).toBe(false);
  });
});
