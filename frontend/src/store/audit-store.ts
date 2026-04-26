import { create } from "zustand";

export interface ImportanceChange {
  item_id: string;
  direction: "elevated" | "reduced";
}

export interface DecisionActivity {
  kind: "decision";
  referrer_type: string;
  command: string | null;
  changes: ImportanceChange[];
  reasoning: string;
  timestamp: string;
}

export interface PersonaActivity {
  kind: "persona";
  rationale: string;
  trust: number;
  observation_count: number;
  timestamp: string;
}

export interface VoiceActivity {
  kind: "voice";
  voice_tag: string;
  utterance_kind: string;
  content: string;
  timestamp: string;
}

export type ActivityEntry = DecisionActivity | PersonaActivity | VoiceActivity;

interface AuditState {
  activities: ActivityEntry[];
  addActivity: (entry: ActivityEntry) => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  activities: [],
  addActivity: (entry) =>
    set((state) => ({ activities: [entry, ...state.activities] })),
}));

export function addDecisionActivity(d: Omit<DecisionActivity, "kind">): void {
  useAuditStore.getState().addActivity({ kind: "decision", ...d });
}

export function addPersonaActivity(p: Omit<PersonaActivity, "kind">): void {
  useAuditStore.getState().addActivity({ kind: "persona", ...p });
}

export function addVoiceActivity(v: Omit<VoiceActivity, "kind">): void {
  useAuditStore.getState().addActivity({ kind: "voice", ...v });
}

export function getActivityCount(state: AuditState): number {
  return state.activities.length;
}
