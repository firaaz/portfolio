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
        className="space-y-4"
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extralight tracking-tight text-foreground">
          {name}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground">{title}</p>
        <p className="text-base md:text-lg font-light text-muted-foreground">
          {subtitle}
        </p>
        <p className="text-sm md:text-base font-light text-muted-foreground/80 leading-relaxed max-w-2xl">
          {summary}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
