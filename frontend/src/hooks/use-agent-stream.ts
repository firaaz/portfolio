import { useEffect } from "react";
import { useManifestStore } from "../store/manifest-store";
import { isStateDelta, isStateSnapshot } from "./sse-parsers";

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
