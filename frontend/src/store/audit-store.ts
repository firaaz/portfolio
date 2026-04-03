import { create } from "zustand";

export interface ImportanceChange {
  item_id: string;
  direction: "elevated" | "reduced";
}

export interface DecisionRecord {
  referrer_type: string;
  command: string | null;
  changes: ImportanceChange[];
  reasoning: string;
  timestamp: string;
}

interface AuditState {
  decisions: DecisionRecord[];
  addDecision: (decision: DecisionRecord) => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  decisions: [],
  addDecision: (decision) =>
    set((state) => ({ decisions: [decision, ...state.decisions] })),
}));

export function getDecisionCount(state: AuditState): number {
  return state.decisions.length;
}
