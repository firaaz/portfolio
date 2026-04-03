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
    <article className="rounded-lg border border-border bg-card p-5 space-y-3">
      <h3 className="text-base font-medium text-card-foreground">{title}</h3>
      <p className="text-sm font-light text-muted-foreground leading-relaxed">
        {description}
      </p>
      <ul className="flex flex-wrap gap-2">
        {tech.map((t) => (
          <li key={t} className="text-xs text-muted-foreground">
            {t}
          </li>
        ))}
      </ul>
    </article>
  );
}
