import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentStream } from "../hooks/use-agent-stream";

const SESSION_KEY = "portfolio.sid";
const ORIGINAL_EVENT_SOURCE = globalThis.EventSource;

let capturedUrls: string[] = [];

beforeEach(() => {
  capturedUrls = [];
  sessionStorage.clear();

  class SpyEventSource {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
    readyState = 0;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onopen: ((event: Event) => void) | null = null;
    constructor(url: string) {
      capturedUrls.push(url);
    }
    close() {
      this.readyState = 2;
    }
  }
  globalThis.EventSource = SpyEventSource as unknown as typeof EventSource;
});

afterEach(() => {
  globalThis.EventSource = ORIGINAL_EVENT_SOURCE;
  vi.restoreAllMocks();
});

describe("useAgentStream", () => {
  it("appends session_id query param from useSessionId to the default url", () => {
    sessionStorage.setItem(SESSION_KEY, "fixed-test-sid");

    renderHook(() => useAgentStream());

    expect(capturedUrls).toHaveLength(1);
    expect(capturedUrls[0]).toBe("/api/agent/stream?session_id=fixed-test-sid");
  });

  it("appends session_id to a caller-provided url", () => {
    sessionStorage.setItem(SESSION_KEY, "custom-url-sid");

    renderHook(() => useAgentStream("/custom/stream"));

    expect(capturedUrls[0]).toBe("/custom/stream?session_id=custom-url-sid");
  });

  it("uri-encodes the session id when building the url", () => {
    sessionStorage.setItem(SESSION_KEY, "id with space&amp");

    renderHook(() => useAgentStream());

    expect(capturedUrls[0]).toBe(
      "/api/agent/stream?session_id=id%20with%20space%26amp",
    );
  });
});

describe("useAgentStream persona handling", () => {
  it("dispatches a PERSONA_DELTA event into usePersonaStore", async () => {
    const { usePersonaStore } = await import("../store/persona-store");
    usePersonaStore.setState({ rationale: "", trust: 0, observations: [] });

    type Handler = (event: MessageEvent) => void;
    const captured: { handler: Handler | null } = { handler: null };
    class CapturingEventSource {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSED = 2;
      readyState = 0;
      onerror: ((event: Event) => void) | null = null;
      onopen: ((event: Event) => void) | null = null;
      readonly url: string;
      constructor(url: string) {
        this.url = url;
      }
      close() {
        this.readyState = 2;
      }
    }
    const proto = CapturingEventSource.prototype as unknown as {
      onmessage: Handler | null;
    };
    Object.defineProperty(proto, "onmessage", {
      configurable: true,
      get() {
        return (this as { _om?: Handler | null })._om ?? null;
      },
      set(handler: Handler | null) {
        (this as { _om?: Handler | null })._om = handler;
        captured.handler = handler;
      },
    });
    globalThis.EventSource =
      CapturingEventSource as unknown as typeof EventSource;

    sessionStorage.setItem(SESSION_KEY, "persona-test-sid");
    renderHook(() => useAgentStream());

    expect(captured.handler).not.toBeNull();
    captured.handler?.(
      new MessageEvent("message", {
        data: JSON.stringify({
          type: "CUSTOM",
          custom: {
            eventType: "persona:delta",
            rationale: "engineer evaluating",
            trust: 0.5,
            observations_added: [
              {
                dimension: "role",
                value: "engineer",
                confidence: 0.6,
                rationale: "dwell pattern",
                source_signals: [{ kind: "signal", id: "s0" }],
                ts: "2026-04-26T12:00:00Z",
              },
            ],
          },
        }),
      }),
    );

    const s = usePersonaStore.getState();
    expect(s.trust).toBe(0.5);
    expect(s.rationale).toBe("engineer evaluating");
    expect(s.observations).toHaveLength(1);
  });
});
