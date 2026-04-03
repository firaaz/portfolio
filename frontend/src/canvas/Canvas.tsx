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
      <div
        role="status"
        aria-label="Loading"
        className="flex items-center justify-center min-h-screen text-muted-foreground text-sm"
      >
        Loading...
      </div>
    );
  }

  const rest = items.filter((item) => item.id !== hero?.id);
  const flowItems = rest.filter((item) => item.importance >= 0.4);
  const bgItems = rest.filter((item) => item.importance < 0.4);

  return (
    <main className="max-w-4xl mx-auto px-6 md:px-8 py-16 md:py-24 antialiased">
      {hero && (
        <section data-zone="hero" className="pb-16 md:pb-20">
          <MoleculeResolver molecule={hero.molecule} data={hero.data} />
        </section>
      )}
      {flowItems.length > 0 && (
        <section data-zone="flow" className="pb-12 md:pb-16">
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
        <section
          data-zone="background"
          className="flex flex-wrap gap-x-4 gap-y-2"
        >
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
