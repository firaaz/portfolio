import { afterEach, describe, expect, it } from "vitest";
import { getHero, useManifestStore } from "../store/manifest-store";

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
    const hero = getHero(useManifestStore.getState());
    expect(hero).toEqual(items[1]);
  });

  it("getHero returns undefined when no item has importance >= 0.9", () => {
    const items = [
      { id: "proj", importance: 0.5, molecule: "project", data: {} },
      { id: "exp", importance: 0.7, molecule: "experience", data: {} },
    ];
    useManifestStore.getState().setManifest(items);
    expect(getHero(useManifestStore.getState())).toBeUndefined();
  });

  it("applyDelta merges importance scores by ID", () => {
    const items = [
      { id: "hero", importance: 1.0, molecule: "hero", data: { name: "Test" } },
      {
        id: "contact",
        importance: 0.6,
        molecule: "contact",
        data: { email: "a@b.com" },
      },
    ];
    useManifestStore.getState().setManifest(items);
    useManifestStore
      .getState()
      .applyDelta([{ id: "contact", importance: 0.85 }]);
    const updated = useManifestStore.getState().items;
    const hero = updated.find((i) => i.id === "hero");
    const contact = updated.find((i) => i.id === "contact");
    expect(hero?.importance).toBe(1.0);
    expect(contact?.importance).toBe(0.85);
    expect(contact?.data).toEqual({ email: "a@b.com" });
  });

  it("applyDelta ignores unknown IDs", () => {
    const items = [
      { id: "hero", importance: 1.0, molecule: "hero", data: { name: "Test" } },
    ];
    useManifestStore.getState().setManifest(items);
    useManifestStore
      .getState()
      .applyDelta([{ id: "nonexistent", importance: 0.5 }]);
    expect(useManifestStore.getState().items).toEqual(items);
  });

  it("applyDelta on empty store is a no-op", () => {
    useManifestStore.getState().applyDelta([{ id: "hero", importance: 0.9 }]);
    expect(useManifestStore.getState().items).toEqual([]);
  });
});
