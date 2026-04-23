import { useEffect } from "react";
import { useUXStore } from "../store/ux-store";
import {
  isUXAgency,
  isUXBridge,
  isUXFocus,
  isUXRecede,
  isUXSalience,
  isUXSignal,
  isUXSnapshot,
  isUXSurface,
  isUXTempo,
} from "./ux-parsers";

export function useAgentStream(url = "/api/agent/stream") {
  const setSnapshot = useUXStore((s) => s.setSnapshot);
  const applySalience = useUXStore((s) => s.applySalience);
  const setTempo = useUXStore((s) => s.setTempo);
  const setAgency = useUXStore((s) => s.setAgency);
  const applyFocus = useUXStore((s) => s.applyFocus);
  const applyRecede = useUXStore((s) => s.applyRecede);
  const applySurface = useUXStore((s) => s.applySurface);
  const addBridge = useUXStore((s) => s.addBridge);

  useEffect(() => {
    const source = new EventSource(url);

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const data: unknown = JSON.parse(event.data);
        if (isUXSnapshot(data)) {
          setSnapshot(data.snapshot);
        } else if (isUXSalience(data)) {
          applySalience(data.custom.items);
        } else if (isUXTempo(data)) {
          setTempo(data.custom.value);
        } else if (isUXAgency(data)) {
          setAgency(data.custom.value);
        } else if (isUXFocus(data)) {
          applyFocus(
            data.custom.item_id,
            data.custom.importance,
            data.custom.emphasis,
          );
        } else if (isUXRecede(data)) {
          applyRecede(data.custom.item_id, data.custom.importance);
        } else if (isUXBridge(data)) {
          addBridge(
            data.custom.source_id,
            data.custom.target_id,
            data.custom.text,
          );
        } else if (isUXSurface(data)) {
          applySurface(data.custom.item_id, data.custom.generated);
        } else if (isUXSignal(data)) {
          // Signal events — confidence/reasoning available for transparency panel
        }
      } catch {
        // Ignore malformed events
      }
    };

    return () => {
      source.close();
    };
  }, [
    url,
    setSnapshot,
    applySalience,
    setTempo,
    setAgency,
    applyFocus,
    applyRecede,
    applySurface,
    addBridge,
  ]);
}
