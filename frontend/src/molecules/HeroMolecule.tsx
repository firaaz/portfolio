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
      >
        <h1>{name}</h1>
        <p>{title}</p>
        <p>{subtitle}</p>
        <p>{summary}</p>
      </motion.div>
    </AnimatePresence>
  );
}
