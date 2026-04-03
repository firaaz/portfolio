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
    <article className="rounded-lg border border-border bg-card p-4 space-y-2 hover:border-foreground/20 transition-colors duration-300">
      <h3 className="text-sm font-medium text-card-foreground">{title}</h3>
      <p className="text-xs font-light text-muted-foreground leading-relaxed">
        {description}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {tech.map((t) => (
          <li
            key={t}
            className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5"
          >
            {t}
          </li>
        ))}
      </ul>
    </article>
  );
}
