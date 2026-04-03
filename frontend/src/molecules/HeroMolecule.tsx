import { AnimatePresence, motion } from "motion/react";

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
    <AnimatePresence mode="wait">
      <motion.div
        key={name}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="space-y-3"
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter text-foreground">
          {name}
        </h1>
        <p className="text-base md:text-lg text-muted-foreground font-light">
          {title}
        </p>
        <p className="text-sm md:text-base font-light text-muted-foreground/70">
          {subtitle}
        </p>
        <p className="text-xs md:text-sm font-light text-muted-foreground/50 leading-relaxed max-w-xl">
          {summary}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
