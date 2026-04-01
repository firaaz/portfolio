import { useEffect } from "react";
import type { ManifestItem } from "../store/manifest-store";
import { useManifestStore } from "../store/manifest-store";

interface StateSnapshotEvent {
  type: "STATE_SNAPSHOT";
  snapshot: {
    manifest: { items: ManifestItem[] };
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

export function useAgentStream(url = "/api/agent/stream") {
  const setManifest = useManifestStore((s) => s.setManifest);

  useEffect(() => {
    const source = new EventSource(url);

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const data: unknown = JSON.parse(event.data);
        if (isStateSnapshot(data)) {
          setManifest(data.snapshot.manifest.items);
        }
      } catch {
        // Ignore malformed events
      }
    };

    return () => {
      source.close();
    };
  }, [url, setManifest]);
}
