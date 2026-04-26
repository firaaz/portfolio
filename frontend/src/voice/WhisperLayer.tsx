import { useEffect, useState } from "react";
import {
  getWhisperUtterances,
  useVoiceStore,
  type VoiceUtterance,
} from "../store/voice-store";

const ACTIVE_OPACITY = 0.6;
const BACKGROUNDED_OPACITY = 0.3;
const NARROW_QUERY = "(max-width: 640px)";

function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(
    () => window.matchMedia(NARROW_QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(NARROW_QUERY);
    const handler = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return narrow;
}

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
  const narrow = useNarrowViewport();

  if (utterances.length === 0) return null;

  const opacity =
    activeVoice === "whisper" ? ACTIVE_OPACITY : BACKGROUNDED_OPACITY;

  const list = (
    <ul className="space-y-1">
      {withStableKeys(utterances).map(({ key, utt }) => (
        <li key={key} className="leading-snug">
          {utt.content}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      aria-label="Whisper layer"
      className="whisper-layer text-xs italic text-ink-30"
      style={{
        opacity,
        transition: "opacity 350ms ease-out",
      }}
    >
      {narrow ? (
        <details>
          <summary>Notes from the agent</summary>
          {list}
        </details>
      ) : (
        list
      )}
    </aside>
  );
}
