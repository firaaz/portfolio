import { afterEach, describe, expect, it } from "vitest";
import {
  addUtterance,
  useVoiceStore,
  type VoiceUtterance,
} from "../store/voice-store";

const baseUtt = (over: Partial<VoiceUtterance> = {}): VoiceUtterance => ({
  voice_tag: "whisper",
  utterance_kind: "observation",
  content: "reading slowly here",
  references: [],
  ...over,
});

afterEach(() => {
  useVoiceStore.setState({
    activeVoice: "whisper",
    utterancesByVoice: {},
  });
});

describe("useVoiceStore", () => {
  it("starts with whisper active and no utterances", () => {
    const s = useVoiceStore.getState();
    expect(s.activeVoice).toBe("whisper");
    expect(s.utterancesByVoice).toEqual({});
  });

  it("addUtterance appends to the matching voice tag bucket", () => {
    addUtterance(baseUtt());
    addUtterance(baseUtt({ content: "you read slowly" }));
    const s = useVoiceStore.getState();
    expect(s.utterancesByVoice.whisper).toHaveLength(2);
    expect(s.utterancesByVoice.whisper?.[0]?.content).toBe(
      "reading slowly here",
    );
    expect(s.utterancesByVoice.whisper?.[1]?.content).toBe("you read slowly");
  });

  it("setActiveVoice updates the active voice tag", () => {
    useVoiceStore.getState().setActiveVoice("letter");
    expect(useVoiceStore.getState().activeVoice).toBe("letter");
  });
});
