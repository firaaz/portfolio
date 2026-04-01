export function HeroMolecule({
  name,
  title,
  subtitle,
  summary,
}: {
  name: string;
  title: string;
  subtitle: string;
  summary: string;
}) {
  return (
    <div>
      <h1>{name}</h1>
      <p>{title}</p>
      <p>{subtitle}</p>
      <p>{summary}</p>
    </div>
  );
}
