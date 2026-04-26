import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { addUtterance, useVoiceStore } from "../store/voice-store";
import { FallbackUtterance } from "../voice/FallbackUtterance";

afterEach(() => {
  cleanup();
  useVoiceStore.setState({ activeVoice: "whisper", utterancesByVoice: {} });
});

const KNOWN = ["whisper", "letter", "dialogue"];

describe("FallbackUtterance", () => {
  it("renders nothing when no unknown-tag utterances exist", () => {
    addUtterance({
      voice_tag: "whisper",
      utterance_kind: "observation",
      content: "x",
      references: [],
    });
    render(<FallbackUtterance knownVoices={KNOWN} />);
    expect(screen.queryByLabelText("Fallback utterance")).toBeNull();
  });

  it("renders unknown-tag utterances as plain gutter italic", () => {
    addUtterance({
      voice_tag: "podcast",
      utterance_kind: "audio-cue",
      content: "tune in",
      references: [],
    });
    render(<FallbackUtterance knownVoices={KNOWN} />);
    expect(screen.getByText(/tune in/i)).toBeInTheDocument();
  });
});
