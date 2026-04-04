import { PresenceDot } from "../chrome/PresenceDot";
import { MoleculeResolver } from "../molecules/MoleculeResolver";
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

export function Canvas({
  onPresenceDotClick,
}: {
  onPresenceDotClick: () => void;
}) {
  const items = useUXStore((s) => s.items);

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
    <main className="surface-grid">
      {ZONE_CONFIG.map(({ name, label, surface }) => (
        <section
          key={name}
          data-zone={name}
          className={`zone zone-${name} ${surface}`}
        >
          <ZoneLabel>{label}</ZoneLabel>
          {zones.get(name)?.map((item) => (
            <div
              key={item.id}
              style={{ opacity: item.salience }}
              className="transition-opacity duration-500 ease-out"
            >
              <MoleculeResolver molecule={item.molecule} data={item.data} />
            </div>
          ))}
        </section>
      ))}
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
