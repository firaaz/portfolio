export function ContactCard({ email, cta }: { email: string; cta: string }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <a
        href={`mailto:${email}`}
        className="inline-block bg-ink text-canvas font-sans text-[9px] font-bold uppercase tracking-[0.15em] px-7 py-3 hover:opacity-85 transition-opacity duration-300"
      >
        {cta}
      </a>
      <a
        href={`mailto:${email}`}
        className="text-xs font-sans text-ink-50 underline underline-offset-[3px] hover:text-ink transition-colors duration-300"
      >
        {email}
      </a>
    </div>
  );
}
