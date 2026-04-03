export function ExperienceCard({
  company,
  role,
  duration,
  description,
}: {
  company: string;
  role: string;
  duration: string;
  description: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 space-y-1.5 hover:border-foreground/20 transition-colors duration-300">
      <h3 className="text-sm font-medium text-card-foreground">{company}</h3>
      <p className="text-xs text-muted-foreground">{role}</p>
      <p className="text-[10px] font-light text-muted-foreground/60 uppercase tracking-wider">
        {duration}
      </p>
      <p className="text-xs font-light text-muted-foreground leading-relaxed">
        {description}
      </p>
    </article>
  );
}
