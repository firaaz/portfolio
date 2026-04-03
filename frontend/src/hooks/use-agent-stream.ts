import { useEffect } from "react";
import { useAuditStore } from "../store/audit-store";
import { useManifestStore } from "../store/manifest-store";
import { isDecisionEvent, isStateDelta, isStateSnapshot } from "./sse-parsers";

export function useAgentStream(url = "/api/agent/stream") {
  const setManifest = useManifestStore((s) => s.setManifest);
  const applyDelta = useManifestStore((s) => s.applyDelta);
  const addDecision = useAuditStore((s) => s.addDecision);

  useEffect(() => {
    const source = new EventSource(url);

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const data: unknown = JSON.parse(event.data);
        if (isStateSnapshot(data)) {
          setManifest(data.snapshot.manifest.items);
        } else if (isDecisionEvent(data)) {
          addDecision({
            ...data.custom.decision,
            timestamp: new Date().toISOString(),
          });
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
  }, [url, setManifest, applyDelta, addDecision]);
}
