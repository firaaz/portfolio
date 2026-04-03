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
    <article className="rounded-lg border border-border bg-card p-5 space-y-2">
      <h3 className="text-base font-medium text-card-foreground">{company}</h3>
      <p className="text-sm text-muted-foreground">{role}</p>
      <p className="text-xs font-light text-muted-foreground/70">{duration}</p>
      <p className="text-sm font-light text-muted-foreground leading-relaxed">
        {description}
      </p>
    </article>
  );
}
