/**
 * Hook for submitting command bar requests via POST-based SSE.
 */
import { useCallback, useState } from "react";
import { useUXStore } from "../store/ux-store";
import {
  isUXAgency,
  isUXSalience,
  isUXSnapshot,
  isUXTempo,
} from "./ux-parsers";

export function useCommandBar(): {
  submitCommand: (text: string) => void;
  isLoading: boolean;
} {
  const [isLoading, setIsLoading] = useState(false);
  const setSnapshot = useUXStore((s) => s.setSnapshot);
  const applySalience = useUXStore((s) => s.applySalience);
  const setTempo = useUXStore((s) => s.setTempo);
  const setAgency = useUXStore((s) => s.setAgency);

  const submitCommand = useCallback(
    async (text: string) => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/agent/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const match = part.match(/^data: (.+)$/m);
            if (!match?.[1]) continue;
            try {
              const data: unknown = JSON.parse(match[1]);
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
              /* ignore malformed */
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [setSnapshot, applySalience, setTempo, setAgency],
  );

  return { submitCommand, isLoading };
}
