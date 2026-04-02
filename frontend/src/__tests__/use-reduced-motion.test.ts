import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReducedMotion } from "../hooks/use-reduced-motion";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useReducedMotion", () => {
  it("returns false when prefers-reduced-motion is not set", () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when prefers-reduced-motion: reduce matches", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });
});
