export function ContactCard({ email, cta }: { email: string; cta: string }) {
  return (
    <article>
      <a href={`mailto:${email}`}>{email}</a>
      <a href={`mailto:${email}`}>{cta}</a>
    </article>
  );
}
