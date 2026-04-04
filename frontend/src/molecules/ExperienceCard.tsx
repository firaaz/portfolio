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
    <article className="space-y-1">
      <span className="block text-[10px] font-sans font-bold uppercase tracking-[0.08em] text-ink-50">
        {company}
      </span>
      <h3 className="text-base font-heading text-ink">{role}</h3>
      <span className="block text-[10px] font-sans text-ink-45">
        {duration}
      </span>
      <div className="breathing-extra opacity-0 max-h-0 overflow-hidden">
        <p className="text-xs font-sans text-ink-65 leading-relaxed pt-1">
          {description}
        </p>
      </div>
    </article>
  );
}
