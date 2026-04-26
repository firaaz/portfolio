import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { addUtterance, useVoiceStore } from "../store/voice-store";
import { DialogueOverlay } from "../voice/DialogueOverlay";

afterEach(() => {
  useVoiceStore.setState({ activeVoice: "whisper", utterancesByVoice: {} });
  cleanup();
});

describe("DialogueOverlay", () => {
  it("renders nothing when no dialogue utterances exist", () => {
    const { container } = render(<DialogueOverlay />);
    expect(
      container.querySelector('[aria-label="Dialogue overlay"]'),
    ).toBeNull();
  });

  it("renders the latest question and answer", () => {
    addUtterance({
      voice_tag: "dialogue",
      utterance_kind: "question",
      content: "What did you build at Emaratech?",
      references: [],
    });
    addUtterance({
      voice_tag: "dialogue",
      utterance_kind: "answer",
      content: "A multi-tenant agent platform with LangGraph.",
      references: [],
    });
    useVoiceStore.setState({ activeVoice: "dialogue" });
    render(<DialogueOverlay />);
    expect(screen.getByText(/build at emaratech/i)).toBeInTheDocument();
    expect(screen.getByText(/langgraph/i)).toBeInTheDocument();
  });

  it("renders only the most recent question when several arrive", () => {
    addUtterance({
      voice_tag: "dialogue",
      utterance_kind: "question",
      content: "older-question",
      references: [],
    });
    addUtterance({
      voice_tag: "dialogue",
      utterance_kind: "question",
      content: "newer-question",
      references: [],
    });
    useVoiceStore.setState({ activeVoice: "dialogue" });
    render(<DialogueOverlay />);
    expect(screen.getByText("newer-question")).toBeInTheDocument();
    expect(screen.queryByText("older-question")).toBeNull();
  });

  it("renders nothing when activeVoice is not 'dialogue'", () => {
    addUtterance({
      voice_tag: "dialogue",
      utterance_kind: "question",
      content: "ambient-question-from-old-session",
      references: [],
    });
    addUtterance({
      voice_tag: "dialogue",
      utterance_kind: "answer",
      content: "ambient-answer-from-old-session",
      references: [],
    });
    useVoiceStore.setState({ activeVoice: "whisper" });
    const { container } = render(<DialogueOverlay />);
    expect(
      container.querySelector('[aria-label="Dialogue overlay"]'),
    ).toBeNull();
  });
});
