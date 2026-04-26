import { getDialogueUtterances, useVoiceStore } from "../store/voice-store";

const ACTIVE_OPACITY = 1;
const BACKGROUNDED_OPACITY = 0.5;

export function DialogueOverlay() {
  const utterances = useVoiceStore(getDialogueUtterances);
  const activeVoice = useVoiceStore((s) => s.activeVoice);

  if (utterances.length === 0) return null;

  let question: string | null = null;
  let answer: string | null = null;
  for (let i = utterances.length - 1; i >= 0; i--) {
    const u = utterances[i];
    if (!u) continue;
    if (!question && u.utterance_kind === "question") question = u.content;
    if (!answer && u.utterance_kind === "answer") answer = u.content;
    if (question && answer) break;
  }

  if (!question && !answer) return null;

  const opacity =
    activeVoice === "dialogue" ? ACTIVE_OPACITY : BACKGROUNDED_OPACITY;

  return (
    <section
      aria-label="Dialogue overlay"
      className="dialogue-overlay"
      style={{
        opacity,
        fontFamily: "'Zilla Slab', serif",
        transition: "opacity 350ms ease-out",
      }}
    >
      {question && (
        <p className="dialogue-question text-lg italic" data-role="question">
          {question}
        </p>
      )}
      {answer && (
        <p className="dialogue-answer text-base mt-3" data-role="answer">
          {answer}
        </p>
      )}
    </section>
  );
}
