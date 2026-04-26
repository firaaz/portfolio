import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addUtterance, useVoiceStore } from "../store/voice-store";
import { WhisperLayer } from "../voice/WhisperLayer";

afterEach(() => {
  cleanup();
  useVoiceStore.setState({
    activeVoice: "whisper",
    utterancesByVoice: {},
  });
  vi.restoreAllMocks();
});

function mockViewport(narrow: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches: narrow && query === "(max-width: 640px)",
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

describe("WhisperLayer", () => {
  it("renders nothing when there are no whisper utterances", () => {
    const { container } = render(<WhisperLayer />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each whisper utterance's content text", () => {
    addUtterance({
      voice_tag: "whisper",
      utterance_kind: "observation",
      content: "reading slowly here",
      references: [],
    });
    addUtterance({
      voice_tag: "whisper",
      utterance_kind: "observation",
      content: "you scan more than read",
      references: [],
    });

    render(<WhisperLayer />);

    expect(screen.getByText("reading slowly here")).toBeInTheDocument();
    expect(screen.getByText("you scan more than read")).toBeInTheDocument();
    expect(screen.getByLabelText(/whisper/i)).toBeInTheDocument();
  });

  it("dims opacity when whisper is not the active voice", () => {
    addUtterance({
      voice_tag: "whisper",
      utterance_kind: "observation",
      content: "ambient line",
      references: [],
    });
    useVoiceStore.getState().setActiveVoice("letter");

    render(<WhisperLayer />);
    const aside = screen.getByLabelText(/whisper/i);
    const opacity = parseFloat(aside.style.opacity);
    expect(opacity).toBeLessThan(0.6);
  });

  describe("on narrow viewports (≤640px)", () => {
    it("renders a closed <details> with 'Notes from the agent' summary", () => {
      mockViewport(true);
      addUtterance({
        voice_tag: "whisper",
        utterance_kind: "observation",
        content: "ambient line",
        references: [],
      });

      render(<WhisperLayer />);

      const summary = screen.getByText("Notes from the agent");
      expect(summary.tagName).toBe("SUMMARY");
      const details = summary.closest("details");
      expect(details).not.toBeNull();
      expect(details?.open).toBe(false);
    });

    it("opens the disclosure when summary is clicked", () => {
      mockViewport(true);
      addUtterance({
        voice_tag: "whisper",
        utterance_kind: "observation",
        content: "ambient line",
        references: [],
      });

      render(<WhisperLayer />);

      const summary = screen.getByText("Notes from the agent");
      const details = summary.closest("details") as HTMLDetailsElement;
      expect(details.open).toBe(false);

      fireEvent.click(summary);
      expect(details.open).toBe(true);
    });
  });

  describe("on wide viewports (>640px)", () => {
    it("renders the inline <ul> without a disclosure", () => {
      mockViewport(false);
      addUtterance({
        voice_tag: "whisper",
        utterance_kind: "observation",
        content: "ambient line",
        references: [],
      });

      render(<WhisperLayer />);

      expect(screen.queryByText("Notes from the agent")).toBeNull();
      expect(screen.getByText("ambient line")).toBeInTheDocument();
    });
  });
});
