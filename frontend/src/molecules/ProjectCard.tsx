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
    <article className="rounded-lg border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2 hover:border-foreground/20 hover:shadow-[0_0_30px_-5px_oklch(0.5_0.1_230/0.15)] transition-all duration-300">
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
