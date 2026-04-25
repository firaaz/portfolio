import { useCallback, useEffect, useRef } from "react";
import type { Signal } from "./use-signal-collector";

const DWELL_THRESHOLD_MS = 1200;
const LINGER_MS = 250;

interface CardState {
  enteredAt: number;
  hovering: boolean;
  dwellTimer: number | null;
  lingerTimer: number | null;
}

export function useCardSignals(addSignal: (signal: Signal) => void) {
  const statesRef = useRef<Map<string, CardState>>(new Map());

  useEffect(() => {
    const states = statesRef.current;
    return () => {
      for (const state of states.values()) {
        if (state.dwellTimer !== null) clearTimeout(state.dwellTimer);
        if (state.lingerTimer !== null) clearTimeout(state.lingerTimer);
      }
      states.clear();
    };
  }, []);

  const emit = useCallback(
    (type: Signal["type"], cardId: string, durationMs: number) => {
      addSignal({
        type,
        card_id: cardId,
        duration_ms: durationMs,
        timestamp: Date.now() / 1000,
      });
    },
    [addSignal],
  );

  const cardHandlers = useCallback(
    (cardId: string) => ({
      onMouseEnter: () => {
        const states = statesRef.current;
        const existing = states.get(cardId);
        if (existing && existing.lingerTimer !== null) {
          clearTimeout(existing.lingerTimer);
          existing.lingerTimer = null;
          return;
        }
        const state: CardState = existing ?? {
          enteredAt: 0,
          hovering: false,
          dwellTimer: null,
          lingerTimer: null,
        };
        state.enteredAt = Date.now();
        state.hovering = true;
        states.set(cardId, state);
        emit("hover", cardId, 0);
        const enteredAt = state.enteredAt;
        state.dwellTimer = window.setTimeout(() => {
          emit("dwell", cardId, Date.now() - enteredAt);
          const s = states.get(cardId);
          if (s) s.dwellTimer = null;
        }, DWELL_THRESHOLD_MS);
      },
      onMouseLeave: () => {
        const state = statesRef.current.get(cardId);
        if (!state?.hovering) return;
        state.lingerTimer = window.setTimeout(() => {
          if (state.dwellTimer !== null) clearTimeout(state.dwellTimer);
          state.dwellTimer = null;
          state.lingerTimer = null;
          state.hovering = false;
        }, LINGER_MS);
      },
      onClick: () => emit("click", cardId, 0),
    }),
    [emit],
  );

  return { cardHandlers };
}
