export function SkillTag({ name }: { name: string }) {
  return (
    <span className="inline-block text-[8px] font-sans font-medium uppercase tracking-[0.1em] bg-ink-06 text-ink-50 px-2.5 py-0.5">
      {name}
    </span>
  );
}
