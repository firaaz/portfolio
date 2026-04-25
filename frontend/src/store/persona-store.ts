import { create } from "zustand";

export interface PersonaSignalRef {
  kind: "signal" | "observation" | "item";
  id: string;
}

export interface PersonaObservation {
  dimension: string;
  value: string;
  confidence: number;
  rationale: string;
  source_signals: PersonaSignalRef[];
  ts: string;
}

export interface PersonaDelta {
  rationale?: string;
  trust?: number;
  observations_added: PersonaObservation[];
  ts?: string;
}

interface PersonaState {
  rationale: string;
  trust: number;
  observations: PersonaObservation[];
}

export const usePersonaStore = create<PersonaState>(() => ({
  rationale: "",
  trust: 0,
  observations: [],
}));

export function applyPersonaDelta(delta: PersonaDelta): void {
  usePersonaStore.setState((state) => ({
    rationale: delta.rationale ?? state.rationale,
    trust: delta.trust ?? state.trust,
    observations: [...state.observations, ...delta.observations_added],
  }));
}

export function getRoleObservations(state: PersonaState): PersonaObservation[] {
  return state.observations.filter((o) => o.dimension === "role");
}
