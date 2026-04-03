export function SkillLink({ name }: { name: string }) {
  return (
    <span className="text-[11px] font-light text-foreground border border-border rounded-full px-2.5 py-0.5 hover:border-foreground/30 transition-colors duration-300">
      {name}
    </span>
  );
}
