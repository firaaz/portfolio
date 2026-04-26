import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureInitialContext,
  useSignalCollector,
} from "../hooks/use-signal-collector";
import { setInferenceDisabled, usePersonaStore } from "../store/persona-store";

const BATCH_INTERVAL_MS = 4000;

function stubNavigator(userAgent: string) {
  vi.stubGlobal("navigator", { ...navigator, userAgent });
}

function stubMatchMedia(matchers: Record<string, boolean>) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matchers[query] ?? false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  usePersonaStore.setState({
    rationale: "",
    trust: 0,
    observations: [],
    inferenceDisabled: false,
  });
});

describe("captureInitialContext", () => {
  it("returns viewport with width, height, pointer_type, prefers_reduced_motion", () => {
    stubMatchMedia({
      "(pointer: coarse)": false,
      "(prefers-reduced-motion: reduce)": false,
    });

    const ctx = captureInitialContext();

    expect(ctx.viewport.width).toBeGreaterThanOrEqual(0);
    expect(ctx.viewport.height).toBeGreaterThanOrEqual(0);
    expect(ctx.viewport.pointer_type).toBe("mouse");
    expect(ctx.viewport.prefers_reduced_motion).toBe(false);
  });

  it("flips pointer_type to touch when (pointer: coarse) matches", () => {
    stubMatchMedia({
      "(pointer: coarse)": true,
      "(prefers-reduced-motion: reduce)": false,
    });

    expect(captureInitialContext().viewport.pointer_type).toBe("touch");
  });

  it("flips prefers_reduced_motion when matchMedia matches", () => {
    stubMatchMedia({
      "(pointer: coarse)": false,
      "(prefers-reduced-motion: reduce)": true,
    });

    expect(captureInitialContext().viewport.prefers_reduced_motion).toBe(true);
  });

  it("derives UA family + platform from navigator.userAgent (Chrome on macOS)", () => {
    stubNavigator(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    stubMatchMedia({});

    const ctx = captureInitialContext();
    expect(ctx.user_agent_summary.family).toBe("Chrome");
    expect(ctx.user_agent_summary.platform).toBe("macOS");
  });

  it("derives Firefox on Linux", () => {
    stubNavigator(
      "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
    );
    stubMatchMedia({});

    const ctx = captureInitialContext();
    expect(ctx.user_agent_summary.family).toBe("Firefox");
    expect(ctx.user_agent_summary.platform).toBe("Linux");
  });

  it("derives Safari on iOS for iPhone", () => {
    stubNavigator(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );
    stubMatchMedia({});

    const ctx = captureInitialContext();
    expect(ctx.user_agent_summary.family).toBe("Safari");
    expect(ctx.user_agent_summary.platform).toBe("iOS");
  });

  it("falls back to Other for unknown UAs", () => {
    stubNavigator("Bot/1.0 (Custom Crawler)");
    stubMatchMedia({});

    const ctx = captureInitialContext();
    expect(ctx.user_agent_summary.family).toBe("Other");
    expect(ctx.user_agent_summary.platform).toBe("Other");
  });

  it("returns landing_path from window.location.pathname", () => {
    stubMatchMedia({});
    expect(captureInitialContext().landing_path).toBe(window.location.pathname);
  });
});

describe("useSignalCollector — initial-context latch", () => {
  it("attaches initial context to the first POST that carries signals", async () => {
    stubNavigator(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    stubMatchMedia({});
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSignalCollector("session-A"));

    result.current.addSignal({
      type: "dwell",
      card_id: "hero",
      duration_ms: 1500,
      timestamp: 1.0,
    });

    await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.session_id).toBe("session-A");
    expect(body.signals).toHaveLength(1);
    expect(body.viewport).toEqual({
      width: window.innerWidth,
      height: window.innerHeight,
      pointer_type: "mouse",
      prefers_reduced_motion: false,
    });
    expect(body.landing_path).toBe(window.location.pathname);
    expect(body.user_agent_summary).toEqual({
      family: "Chrome",
      platform: "macOS",
    });
  });

  it("omits initial context on subsequent POSTs", async () => {
    stubMatchMedia({});
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSignalCollector("session-B"));

    result.current.addSignal({
      type: "dwell",
      card_id: "hero",
      duration_ms: 1500,
      timestamp: 1.0,
    });
    await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

    result.current.addSignal({
      type: "click",
      card_id: "hero",
      duration_ms: 0,
      timestamp: 2.0,
    });
    await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(
      (fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string,
    );
    expect(secondBody.viewport).toBeUndefined();
    expect(secondBody.landing_path).toBeUndefined();
    expect(secondBody.user_agent_summary).toBeUndefined();
  });

  it("does not POST when buffer is empty", async () => {
    stubMatchMedia({});
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useSignalCollector("session-C"));
    await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS * 2);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not POST when sessionId is null", async () => {
    stubMatchMedia({});
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSignalCollector(null));
    result.current.addSignal({
      type: "dwell",
      card_id: "hero",
      duration_ms: 1000,
      timestamp: 1.0,
    });
    await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("useSignalCollector — inference-disabled gate", () => {
  it("skips POST when usePersonaStore.inferenceDisabled is true", async () => {
    stubMatchMedia({});
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);

    setInferenceDisabled(true);

    const { result } = renderHook(() => useSignalCollector("session-D"));
    result.current.addSignal({
      type: "dwell",
      card_id: "hero",
      duration_ms: 1500,
      timestamp: 1.0,
    });
    await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the buffer when gating skips the POST (no replay)", async () => {
    stubMatchMedia({});
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);

    setInferenceDisabled(true);

    const { result } = renderHook(() => useSignalCollector("session-E"));
    result.current.addSignal({
      type: "dwell",
      card_id: "hero",
      duration_ms: 1500,
      timestamp: 1.0,
    });
    await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

    // Re-enable; only signals added AFTER re-enable should ship.
    setInferenceDisabled(false);
    result.current.addSignal({
      type: "click",
      card_id: "hero",
      duration_ms: 0,
      timestamp: 2.0,
    });
    await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    );
    expect(body.signals).toHaveLength(1);
    expect(body.signals[0].type).toBe("click");
  });

  it("resumes POSTing once the flag is flipped back to false", async () => {
    stubMatchMedia({});
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);

    setInferenceDisabled(true);

    const { result } = renderHook(() => useSignalCollector("session-F"));
    result.current.addSignal({
      type: "dwell",
      card_id: "hero",
      duration_ms: 1500,
      timestamp: 1.0,
    });
    await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

    expect(fetchMock).not.toHaveBeenCalled();

    setInferenceDisabled(false);
    result.current.addSignal({
      type: "hover",
      card_id: "hero",
      duration_ms: 200,
      timestamp: 2.0,
    });
    await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
