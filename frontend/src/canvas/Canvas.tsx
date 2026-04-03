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
    <main className="max-w-5xl mx-auto px-6 md:px-10 py-6 md:py-10 antialiased">
      {hero && (
        <section data-zone="hero" className="pb-6 md:pb-8">
          <MoleculeResolver molecule={hero.molecule} data={hero.data} />
        </section>
      )}
      {flowItems.length > 0 && (
        <section data-zone="flow" className="pb-5 md:pb-6">
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
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-8 gap-y-1.5"
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
