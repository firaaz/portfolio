/**
 * Hook for submitting command bar requests via POST-based SSE.
 */
import { useCallback, useState } from "react";
import { useAuditStore } from "../store/audit-store";
import { useManifestStore } from "../store/manifest-store";
import { isDecisionEvent, isStateDelta, isStateSnapshot } from "./sse-parsers";

export function useCommandBar(): {
  submitCommand: (text: string) => void;
  isLoading: boolean;
} {
  const [isLoading, setIsLoading] = useState(false);
  const setManifest = useManifestStore((s) => s.setManifest);
  const applyDelta = useManifestStore((s) => s.applyDelta);
  const addDecision = useAuditStore((s) => s.addDecision);

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
              /* ignore malformed */
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [setManifest, applyDelta, addDecision],
  );

  return { submitCommand, isLoading };
}
