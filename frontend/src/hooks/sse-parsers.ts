/**
 * Shared SSE event type guards for AG-UI protocol.
 */
import type { DecisionRecord } from "../store/audit-store";
import type { ImportanceUpdate, ManifestItem } from "../store/manifest-store";
import type { PersonaObservation } from "../store/persona-store";
import type { VoiceReference } from "../store/voice-store";

export interface StateSnapshotEvent {
  type: "STATE_SNAPSHOT";
  snapshot: {
    manifest: { items: ManifestItem[] };
  };
}

export interface StateDeltaEvent {
  type: "STATE_DELTA";
  delta: {
    updates: ImportanceUpdate[];
  };
}

export function isStateSnapshot(data: unknown): data is StateSnapshotEvent {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    (data as StateSnapshotEvent).type === "STATE_SNAPSHOT"
  );
}

export function isStateDelta(data: unknown): data is StateDeltaEvent {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    (data as StateDeltaEvent).type === "STATE_DELTA"
  );
}

export interface DecisionEvent {
  type: "CUSTOM";
  custom: {
    eventType: "DECISION";
    decision: DecisionRecord;
  };
}

export function isDecisionEvent(data: unknown): data is DecisionEvent {
  if (typeof data !== "object" || data === null || !("type" in data)) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (
    obj.type !== "CUSTOM" ||
    typeof obj.custom !== "object" ||
    obj.custom === null
  ) {
    return false;
  }
  const custom = obj.custom as Record<string, unknown>;
  return custom.eventType === "DECISION";
}

export interface PersonaDeltaEvent {
  type: "CUSTOM";
  custom: {
    eventType: "persona:delta";
    rationale?: string;
    trust?: number;
    observations_added: PersonaObservation[];
    ts?: string;
  };
}

export function isPersonaDelta(data: unknown): data is PersonaDeltaEvent {
  if (typeof data !== "object" || data === null || !("type" in data)) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (
    obj.type !== "CUSTOM" ||
    typeof obj.custom !== "object" ||
    obj.custom === null
  ) {
    return false;
  }
  const custom = obj.custom as Record<string, unknown>;
  return custom.eventType === "persona:delta";
}

export interface VoiceUtteranceEvent {
  type: "CUSTOM";
  custom: {
    eventType: "voice:utterance";
    voice_tag: string;
    utterance_kind: string;
    content: string;
    references?: VoiceReference[];
  };
}

export function isVoiceUtterance(data: unknown): data is VoiceUtteranceEvent {
  if (typeof data !== "object" || data === null || !("type" in data)) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (
    obj.type !== "CUSTOM" ||
    typeof obj.custom !== "object" ||
    obj.custom === null
  ) {
    return false;
  }
  const custom = obj.custom as Record<string, unknown>;
  return custom.eventType === "voice:utterance";
}
