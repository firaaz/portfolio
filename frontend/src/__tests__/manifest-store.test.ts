import { afterEach, describe, expect, it } from "vitest";
import { useManifestStore } from "../store/manifest-store";

afterEach(() => {
  useManifestStore.setState({ items: [] });
});

describe("manifest store", () => {
  it("initializes with empty manifest", () => {
    const { items } = useManifestStore.getState();
    expect(items).toEqual([]);
  });

  it("setManifest replaces items", () => {
    const items = [
      { id: "hero", importance: 1.0, molecule: "hero", data: { name: "Test" } },
      {
        id: "proj",
        importance: 0.5,
        molecule: "project",
        data: { title: "P" },
      },
    ];
    useManifestStore.getState().setManifest(items);
    expect(useManifestStore.getState().items).toEqual(items);
  });

  it("setManifest replaces previous items entirely", () => {
    const first = [
      { id: "a", importance: 0.8, molecule: "hero", data: { name: "A" } },
    ];
    const second = [
      { id: "b", importance: 0.6, molecule: "project", data: { title: "B" } },
    ];
    useManifestStore.getState().setManifest(first);
    useManifestStore.getState().setManifest(second);
    expect(useManifestStore.getState().items).toEqual(second);
  });

  it("getHero returns item with highest importance (>=0.9)", () => {
    const items = [
      { id: "proj", importance: 0.5, molecule: "project", data: {} },
      {
        id: "hero",
        importance: 1.0,
        molecule: "hero",
        data: { name: "Firaaz" },
      },
      { id: "exp", importance: 0.7, molecule: "experience", data: {} },
    ];
    useManifestStore.getState().setManifest(items);
    const hero = useManifestStore.getState().getHero();
    expect(hero).toEqual(items[1]);
  });

  it("getHero returns undefined when no item has importance >= 0.9", () => {
    const items = [
      { id: "proj", importance: 0.5, molecule: "project", data: {} },
      { id: "exp", importance: 0.7, molecule: "experience", data: {} },
    ];
    useManifestStore.getState().setManifest(items);
    expect(useManifestStore.getState().getHero()).toBeUndefined();
  });
});
