import { MoleculeResolver } from "../molecules/MoleculeResolver";
import { getHero, useManifestStore } from "../store/manifest-store";
import { FlowZone } from "./FlowZone";

function importanceToOpacity(importance: number): number {
  if (importance >= 0.85) return 1.0;
  if (importance >= 0.4) return 0.55;
  return 0.25;
}

export function Canvas() {
  const items = useManifestStore((s) => s.items);
  const hero = useManifestStore(getHero);

  if (items.length === 0) {
    return (
      <div role="status" aria-label="Loading">
        Loading...
      </div>
    );
  }

  const rest = items.filter((item) => item.id !== hero?.id);
  const flowItems = rest.filter((item) => item.importance >= 0.4);
  const bgItems = rest.filter((item) => item.importance < 0.4);

  return (
    <main>
      {hero && (
        <section data-zone="hero">
          <MoleculeResolver molecule={hero.molecule} data={hero.data} />
        </section>
      )}
      {flowItems.length > 0 && (
        <section data-zone="flow">
          <FlowZone>
            {flowItems.map((item) => (
              <div
                key={item.id}
                style={{ opacity: importanceToOpacity(item.importance) }}
              >
                <MoleculeResolver molecule={item.molecule} data={item.data} />
              </div>
            ))}
          </FlowZone>
        </section>
      )}
      {bgItems.length > 0 && (
        <section data-zone="background">
          {bgItems.map((item) => (
            <div
              key={item.id}
              style={{ opacity: importanceToOpacity(item.importance) }}
            >
              <MoleculeResolver molecule={item.molecule} data={item.data} />
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
