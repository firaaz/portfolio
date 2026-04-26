import { useCallback, useEffect, useRef } from "react";
import { usePersonaStore } from "../store/persona-store";

export interface Signal {
  type: "dwell" | "skip" | "click" | "hover";
  card_id: string;
  duration_ms: number;
  timestamp: number;
}

export interface InitialContext {
  viewport: {
    width: number;
    height: number;
    pointer_type: "mouse" | "touch" | "pen" | "unknown";
    prefers_reduced_motion: boolean;
  };
  landing_path: string;
  user_agent_summary: { family: string; platform: string };
}

const BATCH_INTERVAL_MS = 4000;

export function captureInitialContext(): InitialContext {
  const ua = navigator.userAgent;
  const family = ua.includes("Firefox")
    ? "Firefox"
    : ua.includes("Chrome")
      ? "Chrome"
      : ua.includes("Safari")
        ? "Safari"
        : "Other";
  const platform =
    ua.includes("iPhone") || ua.includes("iPad")
      ? "iOS"
      : ua.includes("Android")
        ? "Android"
        : ua.includes("Mac")
          ? "macOS"
          : ua.includes("Windows")
            ? "Windows"
            : ua.includes("Linux")
              ? "Linux"
              : "Other";
  const pointer_type = window.matchMedia("(pointer: coarse)").matches
    ? "touch"
    : "mouse";
  return {
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      pointer_type,
      prefers_reduced_motion: window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches,
    },
    landing_path: window.location.pathname,
    user_agent_summary: { family, platform },
  };
}

export function useSignalCollector(sessionId: string | null) {
  const bufferRef = useRef<Signal[]>([]);
  const sentInitialContextRef = useRef(false);

  const addSignal = useCallback((signal: Signal) => {
    bufferRef.current.push(signal);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      const signals = bufferRef.current;
      if (signals.length === 0) return;
      bufferRef.current = [];

      if (usePersonaStore.getState().inferenceDisabled) return;

      const body: {
        session_id: string;
        signals: Signal[];
        viewport?: InitialContext["viewport"];
        landing_path?: string;
        user_agent_summary?: InitialContext["user_agent_summary"];
      } = { session_id: sessionId, signals };

      if (!sentInitialContextRef.current) {
        const ctx = captureInitialContext();
        body.viewport = ctx.viewport;
        body.landing_path = ctx.landing_path;
        body.user_agent_summary = ctx.user_agent_summary;
        sentInitialContextRef.current = true;
      }

      fetch("/api/agent/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {
        // fire-and-forget
      });
    }, BATCH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [sessionId]);

  return { addSignal };
}
