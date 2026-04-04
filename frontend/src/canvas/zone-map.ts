import type { UXItem } from "../store/ux-store";

export type ZoneName =
  | "identity"
  | "featured"
  | "experience"
  | "other-work"
  | "skills"
  | "contact"
  | "education";

export function mapItemsToZones(items: UXItem[]): Map<ZoneName, UXItem[]> {
  const zones = new Map<ZoneName, UXItem[]>();

  const projects = items
    .filter((i) => i.group === "work" && i.molecule === "project")
    .sort((a, b) => b.salience - a.salience);
  const featuredId = projects[0]?.id;

  for (const item of items) {
    let zone: ZoneName | undefined;

    if (item.group === "identity") {
      zone = "identity";
    } else if (item.molecule === "project") {
      zone = item.id === featuredId ? "featured" : "other-work";
    } else if (item.molecule === "experience") {
      zone = "experience";
    } else if (item.molecule === "contact") {
      zone = "contact";
    } else if (item.molecule === "skill") {
      zone = "skills";
    } else if (item.molecule === "education") {
      zone = "education";
    }

    if (zone) {
      const list = zones.get(zone) ?? [];
      list.push(item);
      zones.set(zone, list);
    }
  }

  return zones;
}
