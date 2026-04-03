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
    <article className="rounded-lg border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-1.5 hover:border-foreground/20 hover:shadow-[0_0_30px_-5px_oklch(0.5_0.1_230/0.15)] transition-all duration-300">
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
