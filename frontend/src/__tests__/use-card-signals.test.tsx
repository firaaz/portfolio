import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCardSignals } from "../hooks/use-card-signals";
import type { Signal } from "../hooks/use-signal-collector";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup() {
  const collected: Signal[] = [];
  const addSignal = (s: Signal) => collected.push(s);
  const hook = renderHook(() => useCardSignals(addSignal));
  const handlers = hook.result.current.cardHandlers("hero");
  return { collected, handlers, hook };
}

describe("useCardSignals", () => {
  it("emits one hover when entering, no dwell when leaving before threshold", () => {
    const { collected, handlers } = setup();

    handlers.onMouseEnter();
    vi.advanceTimersByTime(800);
    handlers.onMouseLeave();
    vi.advanceTimersByTime(500); // past linger; dwell timer cancelled

    const types = collected.map((s) => s.type);
    expect(types).toEqual(["hover"]);
    expect(collected[0]?.card_id).toBe("hero");
  });

  it("emits one dwell after 1200ms of continuous hover", () => {
    const { collected, handlers } = setup();

    handlers.onMouseEnter();
    vi.advanceTimersByTime(1200);

    const dwell = collected.find((s) => s.type === "dwell");
    expect(dwell).toBeDefined();
    expect(dwell?.card_id).toBe("hero");
    expect(dwell?.duration_ms).toBeGreaterThanOrEqual(1200);
  });

  it("absorbs a gutter-cross within 250ms linger as a single dwell", () => {
    const { collected, handlers } = setup();

    handlers.onMouseEnter();
    vi.advanceTimersByTime(500);
    handlers.onMouseLeave();
    vi.advanceTimersByTime(100); // inside linger window
    handlers.onMouseEnter();
    vi.advanceTimersByTime(700); // total elapsed since first enter: 1300ms

    const dwells = collected.filter((s) => s.type === "dwell");
    const hovers = collected.filter((s) => s.type === "hover");
    expect(dwells).toHaveLength(1);
    expect(hovers).toHaveLength(1); // re-entry within linger does NOT re-emit hover
  });

  it("treats re-entry past linger as a fresh hover", () => {
    const { collected, handlers } = setup();

    handlers.onMouseEnter();
    vi.advanceTimersByTime(300);
    handlers.onMouseLeave();
    vi.advanceTimersByTime(300); // past linger
    handlers.onMouseEnter();
    vi.advanceTimersByTime(50);

    const hovers = collected.filter((s) => s.type === "hover");
    expect(hovers).toHaveLength(2);
  });

  it("emits a click signal with duration_ms 0", () => {
    const { collected, handlers } = setup();

    handlers.onClick();

    expect(collected).toHaveLength(1);
    expect(collected[0]?.type).toBe("click");
    expect(collected[0]?.card_id).toBe("hero");
    expect(collected[0]?.duration_ms).toBe(0);
  });

  it("does not emit dwell after unmount mid-hover", () => {
    const { collected, handlers, hook } = setup();

    handlers.onMouseEnter();
    vi.advanceTimersByTime(500);
    hook.unmount();
    vi.advanceTimersByTime(2000);

    expect(collected.filter((s) => s.type === "dwell")).toHaveLength(0);
  });

  it("tracks separate timers per card id", () => {
    const collected: Signal[] = [];
    const hook = renderHook(() => useCardSignals((s) => collected.push(s)));
    const heroHandlers = hook.result.current.cardHandlers("hero");
    const projectHandlers = hook.result.current.cardHandlers("project-001");

    heroHandlers.onMouseEnter();
    vi.advanceTimersByTime(600);
    projectHandlers.onMouseEnter();
    vi.advanceTimersByTime(700); // hero hits 1300ms (dwell), project at 700ms

    const dwells = collected.filter((s) => s.type === "dwell");
    expect(dwells).toHaveLength(1);
    expect(dwells[0]?.card_id).toBe("hero");
  });
});
