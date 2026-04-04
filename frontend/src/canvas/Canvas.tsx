import { PresenceDot } from "../chrome/PresenceDot";
import { useDwell } from "../hooks/use-dwell";
import { MoleculeResolver } from "../molecules/MoleculeResolver";
import type { UXItem } from "../store/ux-store";
import { useUXStore } from "../store/ux-store";
import { ZoneLabel } from "./ZoneLabel";
import type { ZoneName } from "./zone-map";
import { mapItemsToZones } from "./zone-map";

const ZONE_CONFIG: { name: ZoneName; label: string; surface: string }[] = [
  { name: "identity", label: "Identity", surface: "surface-inset" },
  { name: "featured", label: "Featured Work", surface: "surface-featured" },
  { name: "experience", label: "Experience", surface: "surface-inset" },
  { name: "other-work", label: "Other Work", surface: "surface-base" },
  { name: "skills", label: "Skills", surface: "surface-base" },
  { name: "contact", label: "Contact", surface: "surface-recessed" },
  { name: "education", label: "Education", surface: "surface-base" },
];

const ROW1_ZONES: string[] = ["identity", "featured"];
const ROW2_ZONES: string[] = ["experience", "other-work", "skills"];
const DIMMED_THRESHOLD = 0.35;

function getGridRows(dwellZone: string | null): string {
  if (!dwellZone) return "1.4fr 1fr auto";
  if (ROW1_ZONES.includes(dwellZone)) return "1.8fr 0.6fr auto";
  if (ROW2_ZONES.includes(dwellZone)) return "1.0fr 1.4fr auto";
  return "1.4fr 1fr auto";
}

function isZoneDimmed(zoneItems: UXItem[] | undefined): boolean {
  if (!zoneItems || zoneItems.length === 0) return false;
  return zoneItems.every((item) => item.salience < DIMMED_THRESHOLD);
}

export function Canvas({
  onPresenceDotClick,
}: {
  onPresenceDotClick: () => void;
}) {
  const items = useUXStore((s) => s.items);
  const { dwellZone, handlers } = useDwell();

  if (items.length === 0) {
    return (
      <div
        role="status"
        aria-label="Loading"
        className="flex items-center justify-center min-h-screen text-ink-50 text-sm"
      >
        Loading...
      </div>
    );
  }

  const zones = mapItemsToZones(items);

  return (
    <main
      className="surface-grid"
      style={{ gridTemplateRows: getGridRows(dwellZone) }}
    >
      {ZONE_CONFIG.map(({ name, label, surface }) => {
        const zoneItems = zones.get(name);
        const dimmed = isZoneDimmed(zoneItems);
        return (
          <section
            key={name}
            data-zone={name}
            data-breathing={dwellZone === name}
            className={`zone zone-${name} ${surface} ${dimmed ? "zone-dimmed" : ""}`}
            {...handlers(name)}
          >
            <ZoneLabel>{label}</ZoneLabel>
            {zoneItems?.map((item) => (
              <div
                key={item.id}
                style={{ opacity: dimmed ? undefined : item.salience }}
                className="transition-opacity duration-500 ease-out"
              >
                <MoleculeResolver molecule={item.molecule} data={item.data} />
              </div>
            ))}
          </section>
        );
      })}
      <section
        data-zone="command"
        className="zone zone-command surface-base flex items-end justify-end"
      >
        {/* Command zone: no dwell handlers — static chrome */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-[10px] text-ink-20">⌘K</span>
            <span className="block text-[9px] text-ink-20">
              Ask me anything
            </span>
          </div>
          <PresenceDot onClick={onPresenceDotClick} />
        </div>
      </section>
    </main>
  );
}
