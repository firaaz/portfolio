import { PresenceDot } from "../chrome/PresenceDot";
import { MoleculeResolver } from "../molecules/MoleculeResolver";
import { getHero, useManifestStore } from "../store/manifest-store";
import { AnimatedMolecule } from "./AnimatedMolecule";
import { FlowZone } from "./FlowZone";

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
              <AnimatedMolecule key={item.id} importance={item.importance}>
                <MoleculeResolver molecule={item.molecule} data={item.data} />
              </AnimatedMolecule>
            ))}
          </FlowZone>
        </section>
      )}
      {bgItems.length > 0 && (
        <section data-zone="background">
          {bgItems.map((item) => (
            <AnimatedMolecule key={item.id} importance={item.importance}>
              <MoleculeResolver molecule={item.molecule} data={item.data} />
            </AnimatedMolecule>
          ))}
        </section>
      )}
      <PresenceDot />
    </main>
  );
}
