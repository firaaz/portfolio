export function ContactCard({ email, cta }: { email: string; cta: string }) {
  return (
    <article className="flex flex-wrap items-baseline gap-x-3 gap-y-2 py-3 border-t border-border">
      <a
        href={`mailto:${email}`}
        className="text-xs font-light text-muted-foreground underline underline-offset-4 decoration-border hover:text-foreground transition-colors duration-300"
      >
        {email}
      </a>
      <span className="text-muted-foreground/40" aria-hidden="true">
        /
      </span>
      <a
        href={`mailto:${email}`}
        className="text-sm font-medium text-foreground hover:text-muted-foreground transition-colors duration-300"
      >
        {cta}
      </a>
    </article>
  );
}
