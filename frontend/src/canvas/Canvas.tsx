import { PresenceDot } from "../chrome/PresenceDot";
import { MoleculeResolver } from "../molecules/MoleculeResolver";
import type { UXItem } from "../store/ux-store";
import { useUXStore } from "../store/ux-store";

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
        className="flex items-center justify-center min-h-screen text-muted-foreground text-sm"
      >
        Loading...
      </div>
    );
  }

  const groups = new Map<string, UXItem[]>();
  for (const item of items) {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
  }

  return (
    <main className="max-w-5xl mx-auto px-6 md:px-10 py-6 md:py-10 antialiased">
      {[...groups.entries()].map(([group, groupItems]) => (
        <section key={group} data-zone={group} className="mb-8">
          {groupItems.map((item) => (
            <div
              key={item.id}
              style={{ opacity: item.salience }}
              className="transition-opacity duration-500 ease-out mb-4"
            >
              <MoleculeResolver molecule={item.molecule} data={item.data} />
            </div>
          ))}
        </section>
      ))}
      <PresenceDot onClick={onPresenceDotClick} />
    </main>
  );
}
