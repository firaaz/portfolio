import {
  getWhisperUtterances,
  useVoiceStore,
  type VoiceUtterance,
} from "../store/voice-store";

const ACTIVE_OPACITY = 0.6;
const BACKGROUNDED_OPACITY = 0.3;

function withStableKeys(
  utterances: readonly VoiceUtterance[],
): { key: string; utt: VoiceUtterance }[] {
  const seen = new Map<string, number>();
  return utterances.map((utt) => {
    const base = `${utt.voice_tag}::${utt.content}`;
    const seq = seen.get(base) ?? 0;
    seen.set(base, seq + 1);
    return { key: seq === 0 ? base : `${base}#${seq}`, utt };
  });
}

export function WhisperLayer() {
  const utterances = useVoiceStore(getWhisperUtterances);
  const activeVoice = useVoiceStore((s) => s.activeVoice);

  if (utterances.length === 0) return null;

  const opacity =
    activeVoice === "whisper" ? ACTIVE_OPACITY : BACKGROUNDED_OPACITY;

  return (
    <aside
      aria-label="Whisper layer"
      className="whisper-layer text-xs italic text-ink-30"
      style={{
        opacity,
        transition: "opacity 350ms ease-out",
      }}
    >
      <ul className="space-y-1">
        {withStableKeys(utterances).map(({ key, utt }) => (
          <li key={key} className="leading-snug">
            {utt.content}
          </li>
        ))}
      </ul>
    </aside>
  );
}
