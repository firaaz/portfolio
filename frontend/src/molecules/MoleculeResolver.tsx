import type { ComponentType } from "react";
import { ExperienceCard } from "./ExperienceCard";
import { HeroMolecule } from "./HeroMolecule";
import { ProjectCard } from "./ProjectCard";

const registry: Record<string, ComponentType<Record<string, unknown>>> = {
  hero: HeroMolecule as ComponentType<Record<string, unknown>>,
  project: ProjectCard as ComponentType<Record<string, unknown>>,
  experience: ExperienceCard as ComponentType<Record<string, unknown>>,
};

export function MoleculeResolver({
  molecule,
  data,
}: {
  molecule: string;
  data: Record<string, unknown>;
}) {
  const Component = registry[molecule];

  if (!Component) {
    return <div>{molecule}</div>;
  }

  return <Component {...data} />;
}
