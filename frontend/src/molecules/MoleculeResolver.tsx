import type { ComponentType } from "react";
import { ContactCard } from "./ContactCard";
import { EducationMolecule } from "./EducationMolecule";
import { ExperienceCard } from "./ExperienceCard";
import { HeroMolecule } from "./HeroMolecule";
import { ProjectCard } from "./ProjectCard";
import { SkillTag } from "./SkillTag";

const registry: Record<string, ComponentType<Record<string, unknown>>> = {
  hero: HeroMolecule as ComponentType<Record<string, unknown>>,
  project: ProjectCard as ComponentType<Record<string, unknown>>,
  experience: ExperienceCard as ComponentType<Record<string, unknown>>,
  contact: ContactCard as ComponentType<Record<string, unknown>>,
  skill: SkillTag as ComponentType<Record<string, unknown>>,
  education: EducationMolecule as ComponentType<Record<string, unknown>>,
};

export function MoleculeResolver({
  molecule,
  data,
  emphasis,
  generated,
}: {
  molecule: string;
  data: Record<string, unknown>;
  emphasis?: string[];
  generated?: Record<string, string>;
}) {
  const Component = registry[molecule];

  if (!Component) {
    return <div>{molecule}</div>;
  }

  return <Component {...data} emphasis={emphasis} generated={generated} />;
}
