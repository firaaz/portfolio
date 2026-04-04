import { useEffect } from "react";
import { useUXStore } from "../store/ux-store";
import {
  isUXAgency,
  isUXSalience,
  isUXSnapshot,
  isUXTempo,
} from "./ux-parsers";

export function useAgentStream(url = "/api/agent/stream") {
  const setSnapshot = useUXStore((s) => s.setSnapshot);
  const applySalience = useUXStore((s) => s.applySalience);
  const setTempo = useUXStore((s) => s.setTempo);
  const setAgency = useUXStore((s) => s.setAgency);

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
        }
      } catch {
        // Ignore malformed events
      }
    };

    return () => {
      source.close();
    };
  }, [url, setSnapshot, applySalience, setTempo, setAgency]);
}
