import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useSessionId } from "../hooks/use-session-id";

const KEY = "portfolio.sid";

afterEach(() => {
  sessionStorage.clear();
});

describe("useSessionId", () => {
  it("given empty sessionStorage, when called, then returns a UUID and persists it", () => {
    const { result } = renderHook(() => useSessionId());

    expect(result.current).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(sessionStorage.getItem(KEY)).toBe(result.current);
  });

  it("given existing key, when called, then returns the persisted value", () => {
    sessionStorage.setItem(KEY, "preset-uuid");

    const { result } = renderHook(() => useSessionId());

    expect(result.current).toBe("preset-uuid");
  });

  it("given two renders in same tab, when called, then returns the same id", () => {
    const first = renderHook(() => useSessionId()).result.current;
    const second = renderHook(() => useSessionId()).result.current;

    expect(second).toBe(first);
  });
});
