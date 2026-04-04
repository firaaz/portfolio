export function ProjectCard({
  title,
  description,
  tech,
}: {
  title: string;
  description: string;
  tech: string[];
}) {
  return (
    <article className="space-y-2">
      <h3
        className="font-heading font-light italic text-ink"
        style={{ fontSize: "clamp(16px, 2vw, 22px)" }}
      >
        {title}
      </h3>
      <p className="text-xs font-sans text-ink-65 leading-relaxed">
        {description}
      </p>
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
      <div className="breathing-extra opacity-0 max-h-0 overflow-hidden" />
    </article>
  );
}
