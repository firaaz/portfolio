import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDwell } from "../hooks/use-dwell";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDwell", () => {
  it("returns null dwellZone initially", () => {
    const { result } = renderHook(() => useDwell());
    expect(result.current.dwellZone).toBeNull();
  });

  it("triggers dwell after 2s threshold", () => {
    const { result } = renderHook(() => useDwell());

    act(() => result.current.handlers("featured").onMouseEnter());
    expect(result.current.dwellZone).toBeNull();

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.dwellZone).toBe("featured");
  });

  it("does not trigger dwell on short hover (<2s)", () => {
    const { result } = renderHook(() => useDwell());

    act(() => result.current.handlers("skills").onMouseEnter());
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.handlers("skills").onMouseLeave());

    expect(result.current.dwellZone).toBeNull();
  });

  it("clears dwell after leave + 300ms linger", () => {
    const { result } = renderHook(() => useDwell());

    act(() => result.current.handlers("featured").onMouseEnter());
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.dwellZone).toBe("featured");

    act(() => result.current.handlers("featured").onMouseLeave());
    expect(result.current.dwellZone).toBe("featured"); // lingering

    act(() => vi.advanceTimersByTime(300));
    expect(result.current.dwellZone).toBeNull();
  });

  it("clears old dwell immediately when entering new zone", () => {
    const { result } = renderHook(() => useDwell());

    act(() => result.current.handlers("featured").onMouseEnter());
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.dwellZone).toBe("featured");

    act(() => result.current.handlers("featured").onMouseLeave());
    act(() => result.current.handlers("experience").onMouseEnter());
    expect(result.current.dwellZone).toBeNull(); // old dwell cleared

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.dwellZone).toBe("experience");
  });

  it("accepts custom threshold and linger", () => {
    const { result } = renderHook(() => useDwell(1000, 500));

    act(() => result.current.handlers("skills").onMouseEnter());
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.dwellZone).toBe("skills");

    act(() => result.current.handlers("skills").onMouseLeave());
    act(() => vi.advanceTimersByTime(499));
    expect(result.current.dwellZone).toBe("skills");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.dwellZone).toBeNull();
  });
});
