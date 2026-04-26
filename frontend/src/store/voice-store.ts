import { create } from "zustand";

export interface VoiceReference {
  kind: string;
  id: string;
}

export interface VoiceUtterance {
  voice_tag: string;
  utterance_kind: string;
  content: string;
  references: VoiceReference[];
}

interface VoiceState {
  activeVoice: string;
  utterancesByVoice: Record<string, VoiceUtterance[]>;
  setActiveVoice: (tag: string) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  activeVoice: "whisper",
  utterancesByVoice: {},
  setActiveVoice: (tag) => set({ activeVoice: tag }),
}));

export function addUtterance(utt: VoiceUtterance): void {
  useVoiceStore.setState((state) => {
    const prior = state.utterancesByVoice[utt.voice_tag] ?? [];
    return {
      utterancesByVoice: {
        ...state.utterancesByVoice,
        [utt.voice_tag]: [...prior, utt],
      },
    };
  });
}

const EMPTY_UTTERANCES: readonly VoiceUtterance[] = Object.freeze([]);

export function getWhisperUtterances(
  state: VoiceState,
): readonly VoiceUtterance[] {
  return state.utterancesByVoice.whisper ?? EMPTY_UTTERANCES;
}

export function getLetterUtterances(
  state: VoiceState,
): readonly VoiceUtterance[] {
  return state.utterancesByVoice.letter ?? EMPTY_UTTERANCES;
}

export function getDialogueUtterances(
  state: VoiceState,
): readonly VoiceUtterance[] {
  return state.utterancesByVoice.dialogue ?? EMPTY_UTTERANCES;
}

export function getHighlightedItemIds(state: VoiceState): string[] {
  const dialogue = state.utterancesByVoice.dialogue ?? EMPTY_UTTERANCES;
  const ids = new Set<string>();
  for (const u of dialogue) {
    if (u.utterance_kind !== "receipt") continue;
    for (const ref of u.references) {
      if (ref.kind === "item") ids.add(ref.id);
    }
  }
  return [...ids];
}
