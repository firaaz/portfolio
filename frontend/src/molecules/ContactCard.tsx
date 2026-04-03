export function ContactCard({ email, cta }: { email: string; cta: string }) {
  return (
    <article className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      <a
        href={`mailto:${email}`}
        className="text-sm font-light text-muted-foreground underline underline-offset-4 decoration-border hover:text-foreground transition-colors duration-300"
      >
        {email}
      </a>
      <a
        href={`mailto:${email}`}
        className="text-base text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors duration-300"
      >
        {cta}
      </a>
    </article>
  );
}
