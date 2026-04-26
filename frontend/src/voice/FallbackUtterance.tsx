import { useVoiceStore, type VoiceUtterance } from "../store/voice-store";

function withStableKeys(
  utterances: VoiceUtterance[],
): { key: string; utt: VoiceUtterance }[] {
  const seen = new Map<string, number>();
  return utterances.map((utt) => {
    const base = `${utt.voice_tag}::${utt.content}`;
    const seq = seen.get(base) ?? 0;
    seen.set(base, seq + 1);
    return { key: seq === 0 ? base : `${base}#${seq}`, utt };
  });
}

export function FallbackUtterance({ knownVoices }: { knownVoices: string[] }) {
  const map = useVoiceStore((s) => s.utterancesByVoice);
  const unknown = Object.entries(map).flatMap(([tag, utts]) =>
    knownVoices.includes(tag) ? [] : utts,
  );
  if (unknown.length === 0) return null;
  return (
    <aside
      aria-label="Fallback utterance"
      className="fallback-utterance"
      style={{ fontStyle: "italic", opacity: 0.5 }}
    >
      <ul>
        {withStableKeys(unknown).map(({ key, utt }) => (
          <li key={key} className="text-xs text-ink-30">
            {utt.content}
          </li>
        ))}
      </ul>
    </aside>
  );
}
