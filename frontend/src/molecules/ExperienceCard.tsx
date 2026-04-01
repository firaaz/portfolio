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
    <article>
      <h3>{company}</h3>
      <p>{role}</p>
      <p>{duration}</p>
      <p>{description}</p>
    </article>
  );
}
