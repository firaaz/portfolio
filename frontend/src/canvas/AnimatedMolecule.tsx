import type { ReactNode } from "react";

function importanceToOpacity(importance: number): number {
  if (importance >= 0.85) return 1.0;
  if (importance >= 0.4) return 0.55;
  return 0.25;
}

export function AnimatedMolecule({
  importance,
  children,
}: {
  importance: number;
  children: ReactNode;
}) {
  return (
    <div
      className="will-change-[opacity]"
      style={{
        opacity: importanceToOpacity(importance),
        transition: "opacity 500ms ease-out",
      }}
    >
      {children}
    </div>
  );
}
