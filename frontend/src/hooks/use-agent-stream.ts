import { useEffect } from "react";
import type { ImportanceUpdate, ManifestItem } from "../store/manifest-store";
import { useManifestStore } from "../store/manifest-store";

interface StateSnapshotEvent {
  type: "STATE_SNAPSHOT";
  snapshot: {
    manifest: { items: ManifestItem[] };
  };
}

interface StateDeltaEvent {
  type: "STATE_DELTA";
  delta: {
    updates: ImportanceUpdate[];
  };
}

function isStateSnapshot(data: unknown): data is StateSnapshotEvent {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    (data as StateSnapshotEvent).type === "STATE_SNAPSHOT"
  );
}

function isStateDelta(data: unknown): data is StateDeltaEvent {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    (data as StateDeltaEvent).type === "STATE_DELTA"
  );
}

export function useAgentStream(url = "/api/agent/stream") {
  const setManifest = useManifestStore((s) => s.setManifest);
  const applyDelta = useManifestStore((s) => s.applyDelta);

  useEffect(() => {
    const source = new EventSource(url);

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const data: unknown = JSON.parse(event.data);
        if (isStateSnapshot(data)) {
          setManifest(data.snapshot.manifest.items);
        } else if (isStateDelta(data)) {
          applyDelta(data.delta.updates);
        }
      } catch {
        // Ignore malformed events
      }
    };

    return () => {
      source.close();
    };
  }, [url, setManifest, applyDelta]);
}
