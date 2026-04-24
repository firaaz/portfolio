export function ProjectCard({
  title,
  description,
  tech = [],
  emphasis,
  generated,
}: {
  title: string;
  description: string;
  tech?: string[];
  emphasis?: string[];
  generated?: Record<string, string>;
}) {
  const displayTitle = generated?.title ?? title;
  const displayDesc = generated?.description ?? description;
  const showDescription = !emphasis || emphasis.includes("description");
  const showTech = !emphasis || emphasis.includes("tech");

  return (
    <article className="space-y-2">
      <h3
        className="font-heading font-light italic text-ink"
        style={{ fontSize: "clamp(16px, 2vw, 22px)" }}
      >
        {displayTitle}
      </h3>
      {showDescription && (
        <p className="text-xs font-sans text-ink-65 leading-relaxed">
          {displayDesc}
        </p>
      )}
      {showTech && (
        <ul className="flex flex-wrap gap-1.5">
          {tech.map((t) => (
            <li
              key={t}
              className="text-[8px] font-sans uppercase tracking-[0.1em] bg-ink-06 text-ink-50 px-2.5 py-0.5"
            >
              {t}
            </li>
          ))}
        </ul>
      )}
      <div className="breathing-extra opacity-0 max-h-0 overflow-hidden" />
    </article>
  );
}
