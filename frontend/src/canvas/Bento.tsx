import { motion, useReducedMotion } from "motion/react";
import { MoleculeResolver } from "../molecules/MoleculeResolver";
import type { UXItem } from "../store/ux-store";
import { computeLayout } from "./bento-layout";

const SPRING = { type: "spring" as const, stiffness: 200, damping: 22 };

export function Bento({ items }: { items: UXItem[] }) {
  const layout = computeLayout(items);
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const reducedMotion = useReducedMotion();

  return (
    <section className="bento-grid" aria-label="Content">
      {layout.map((entry) => {
        const item = itemsById.get(entry.id);
        if (!item) return null;
        const style = entry.hidden
          ? { display: "none" as const }
          : {
              gridColumn: `span ${entry.colSpan}`,
              gridRow: `span ${entry.rowSpan}`,
            };
        return (
          <motion.article
            key={entry.id}
            layout={!reducedMotion}
            transition={SPRING}
            data-testid={`bento-card-${entry.id}`}
            data-tier={entry.tier}
            className="bento-card"
            style={style}
            aria-hidden={entry.hidden ? true : undefined}
          >
            <MoleculeResolver
              molecule={item.molecule}
              data={item.data}
              emphasis={item.emphasis}
              generated={item.generated}
            />
          </motion.article>
        );
      })}
    </section>
  );
}
