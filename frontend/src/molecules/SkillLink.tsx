export function SkillLink({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-foreground/80 py-0.5">
      <span
        className="w-1.5 h-1.5 rounded-full bg-[oklch(0.6_0.12_230)] shrink-0"
        aria-hidden="true"
      />
      {name}
    </span>
  );
}
