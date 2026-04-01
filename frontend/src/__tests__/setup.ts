import "@testing-library/jest-dom/vitest";

// Stub EventSource for happy-dom (not available in JSDOM/happy-dom)
if (typeof globalThis.EventSource === "undefined") {
  globalThis.EventSource = class EventSource {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
    readyState = 0;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onopen: ((event: Event) => void) | null = null;
    close() {
      this.readyState = 2;
    }
  } as unknown as typeof EventSource;
}
