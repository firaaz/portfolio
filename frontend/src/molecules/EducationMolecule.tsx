export function EducationMolecule({
  degree,
  institution,
}: {
  degree: string;
  institution: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-sans text-ink-65">{degree}</p>
      <p className="text-[10px] font-sans text-ink-45">{institution}</p>
    </div>
  );
}
