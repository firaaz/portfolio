import { getLetterUtterances, useVoiceStore } from "../store/voice-store";

const ACTIVE_OPACITY = 1;
const BACKGROUNDED_OPACITY = 0.4;
const ACTIVE_FONT_SIZE = "1.25rem";
const BACKGROUNDED_FONT_SIZE = "0.875rem";

export function CoverLetterPanel() {
  const utterances = useVoiceStore(getLetterUtterances);
  const activeVoice = useVoiceStore((s) => s.activeVoice);

  if (utterances.length === 0) return null;
  const latest = utterances[utterances.length - 1];
  if (!latest) return null;

  const isActive = activeVoice === "letter";
  const opacity = isActive ? ACTIVE_OPACITY : BACKGROUNDED_OPACITY;
  const fontSize = isActive ? ACTIVE_FONT_SIZE : BACKGROUNDED_FONT_SIZE;

  return (
    <section
      aria-label="Cover letter"
      className="cover-letter"
      style={{
        opacity,
        fontFamily: "'Zilla Slab', serif",
        fontSize,
        lineHeight: 1.6,
        transition: "opacity 350ms ease-out, font-size 350ms ease-out",
      }}
    >
      <p>{latest.content}</p>
    </section>
  );
}
