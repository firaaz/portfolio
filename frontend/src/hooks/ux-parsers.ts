/**
 * Type guards for UX protocol SSE events (AG-UI adapter).
 */
import type { UXGlobals, UXItem, SalienceUpdate } from "../store/ux-store";

export interface UXSnapshotEvent {
  type: "STATE_SNAPSHOT";
  snapshot: {
    ux: UXGlobals;
    items: UXItem[];
  };
}

export interface UXSalienceEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:salience";
    items: SalienceUpdate[];
  };
}

export interface UXTempoEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:tempo";
    value: number;
  };
}

export interface UXAgencyEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:agency";
    value: number;
  };
}

function hasCustomEventType(data: unknown, eventType: string): boolean {
  if (typeof data !== "object" || data === null || !("type" in data)) return false;
  const obj = data as Record<string, unknown>;
  if (obj.type !== "CUSTOM" || typeof obj.custom !== "object" || obj.custom === null)
    return false;
  return (obj.custom as Record<string, unknown>).eventType === eventType;
}

export function isUXSnapshot(data: unknown): data is UXSnapshotEvent {
  if (typeof data !== "object" || data === null || !("type" in data)) return false;
  const obj = data as Record<string, unknown>;
  if (obj.type !== "STATE_SNAPSHOT") return false;
  const snapshot = obj.snapshot as Record<string, unknown> | undefined;
  return snapshot !== undefined && "ux" in snapshot && "items" in snapshot;
}

export function isUXSalience(data: unknown): data is UXSalienceEvent {
  return hasCustomEventType(data, "ux:salience");
}

export function isUXTempo(data: unknown): data is UXTempoEvent {
  return hasCustomEventType(data, "ux:tempo");
}

export function isUXAgency(data: unknown): data is UXAgencyEvent {
  return hasCustomEventType(data, "ux:agency");
}
