import { useManifestStore } from "../store/manifest-store";

export function Canvas() {
  const items = useManifestStore((s) => s.items);
  const getHero = useManifestStore((s) => s.getHero);

  if (items.length === 0) {
    return (
      <div role="status" aria-label="Loading">
        Loading...
      </div>
    );
  }

  const hero = getHero();
  const rest = items.filter((item) => item.importance < 0.9);

  return (
    <main>
      {hero && (
        <section data-zone="hero">
          <h1>{hero.data.name as string}</h1>
          <p>{hero.data.title as string}</p>
        </section>
      )}
      {rest.length > 0 && (
        <section data-zone="flow">
          {rest.map((item) => (
            <div key={item.id}>
              {(item.data.title as string | undefined) ??
                (item.data.name as string | undefined) ??
                item.id}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
