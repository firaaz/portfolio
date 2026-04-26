import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { addUtterance, useVoiceStore } from "../store/voice-store";
import { CoverLetterPanel } from "../voice/CoverLetterPanel";

afterEach(() => {
  useVoiceStore.setState({ activeVoice: "whisper", utterancesByVoice: {} });
  cleanup();
});

describe("CoverLetterPanel", () => {
  it("renders nothing when no letter utterance exists", () => {
    const { container } = render(<CoverLetterPanel />);
    expect(container.querySelector('[aria-label="Cover letter"]')).toBeNull();
  });

  it("renders the most recent letter utterance content", () => {
    addUtterance({
      voice_tag: "letter",
      utterance_kind: "pitch",
      content: "You will find a senior AI engineer here.",
      references: [],
    });
    addUtterance({
      voice_tag: "letter",
      utterance_kind: "pitch",
      content: "You will find a builder who ships.",
      references: [],
    });
    useVoiceStore.setState({ activeVoice: "letter" });
    render(<CoverLetterPanel />);
    expect(screen.getByText(/builder who ships/i)).toBeInTheDocument();
  });

  it("scales down when dialogue is the active voice", () => {
    addUtterance({
      voice_tag: "letter",
      utterance_kind: "pitch",
      content: "x",
      references: [],
    });
    useVoiceStore.setState({ activeVoice: "dialogue" });
    const { container } = render(<CoverLetterPanel />);
    const panel = container.querySelector(
      '[aria-label="Cover letter"]',
    ) as HTMLElement | null;
    expect(parseFloat(panel?.style.opacity ?? "1")).toBeLessThan(1);
  });
});
