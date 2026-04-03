/**
 * Shared SSE event type guards for AG-UI protocol.
 */
import type { ImportanceUpdate, ManifestItem } from "../store/manifest-store";

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
