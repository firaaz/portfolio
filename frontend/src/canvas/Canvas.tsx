import { MoleculeResolver } from "../molecules/MoleculeResolver";
import { getHero, useManifestStore } from "../store/manifest-store";

function importanceToOpacity(importance: number): number {
  if (importance >= 0.9) return 1.0;
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
  const rest = items.filter((item) => item.importance < 0.9);

  return (
    <main>
      {hero && (
        <section data-zone="hero">
          <MoleculeResolver molecule={hero.molecule} data={hero.data} />
        </section>
      )}
      {rest.length > 0 && (
        <section data-zone="flow">
          {rest.map((item) => (
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
