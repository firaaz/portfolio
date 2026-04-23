/**
 * Type guards for UX protocol SSE events (AG-UI adapter).
 */
import type { SalienceUpdate, UXGlobals, UXItem } from "../store/ux-store";

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
  if (typeof data !== "object" || data === null || !("type" in data))
    return false;
  const obj = data as Record<string, unknown>;
  if (
    obj.type !== "CUSTOM" ||
    typeof obj.custom !== "object" ||
    obj.custom === null
  )
    return false;
  return (obj.custom as Record<string, unknown>).eventType === eventType;
}

export function isUXSnapshot(data: unknown): data is UXSnapshotEvent {
  if (typeof data !== "object" || data === null || !("type" in data))
    return false;
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

export interface UXFocusEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:focus";
    item_id: string;
    importance: number;
    emphasis: string[];
  };
}

export interface UXRecedeEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:recede";
    item_id: string;
    importance: number;
  };
}

export interface UXBridgeEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:bridge";
    source_id: string;
    target_id: string;
    text: string;
  };
}

export interface UXSurfaceEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:surface";
    item_id: string;
    generated: Record<string, string>;
  };
}

export interface UXSignalEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:signal";
    confidence: number;
    reasoning: string;
  };
}

export function isUXFocus(data: unknown): data is UXFocusEvent {
  return hasCustomEventType(data, "ux:focus");
}

export function isUXRecede(data: unknown): data is UXRecedeEvent {
  return hasCustomEventType(data, "ux:recede");
}

export function isUXBridge(data: unknown): data is UXBridgeEvent {
  return hasCustomEventType(data, "ux:bridge");
}

export function isUXSurface(data: unknown): data is UXSurfaceEvent {
  return hasCustomEventType(data, "ux:surface");
}

export function isUXSignal(data: unknown): data is UXSignalEvent {
  return hasCustomEventType(data, "ux:signal");
}
