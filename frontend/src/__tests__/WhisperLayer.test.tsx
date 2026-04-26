import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { addUtterance, useVoiceStore } from "../store/voice-store";
import { WhisperLayer } from "../voice/WhisperLayer";

afterEach(() => {
  cleanup();
  useVoiceStore.setState({
    activeVoice: "whisper",
    utterancesByVoice: {},
  });
});

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
});
