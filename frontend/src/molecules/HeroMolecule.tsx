export function HeroMolecule({
  name,
  title,
  subtitle,
  summary,
}: {
  name: string;
  title: string;
  subtitle: string;
  summary: string;
}) {
  return (
    <div className="space-y-3">
      <h1
        className="font-heading font-bold text-ink"
        style={{ fontSize: "clamp(24px, 3.5vw, 32px)" }}
      >
        {name}
      </h1>
      <p className="text-[11px] font-sans uppercase tracking-[0.12em] text-ink-45">
        {title} &middot; {subtitle}
      </p>
      <p className="text-[13px] font-sans text-ink-65 leading-relaxed max-w-md">
        {summary}
      </p>
    </div>
  );
}
