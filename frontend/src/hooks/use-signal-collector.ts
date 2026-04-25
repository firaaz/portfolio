import { useCallback, useEffect, useRef } from "react";

export interface Signal {
  type: "dwell" | "skip" | "click" | "hover";
  card_id: string;
  duration_ms: number;
  timestamp: number;
}

const BATCH_INTERVAL_MS = 4000;

export function useSignalCollector(sessionId: string | null) {
  const bufferRef = useRef<Signal[]>([]);

  const addSignal = useCallback((signal: Signal) => {
    bufferRef.current.push(signal);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      const signals = bufferRef.current;
      if (signals.length === 0) return;
      bufferRef.current = [];

      fetch("/api/agent/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, signals }),
      }).catch(() => {
        // fire-and-forget
      });
    }, BATCH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [sessionId]);

  return { addSignal };
}
