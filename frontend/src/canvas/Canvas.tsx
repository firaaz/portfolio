import { PresenceDot } from "../chrome/PresenceDot";
import { useCardSignals } from "../hooks/use-card-signals";
import { useSessionId } from "../hooks/use-session-id";
import { useSignalCollector } from "../hooks/use-signal-collector";
import type { UXItem } from "../store/ux-store";
import { useUXStore } from "../store/ux-store";
import { CoverLetterPanel } from "../voice/CoverLetterPanel";
import { WhisperLayer } from "../voice/WhisperLayer";
import { Bento } from "./Bento";

const NEUTRAL_SALIENCE = 0.5;

function neutralize(items: UXItem[]): UXItem[] {
  if (items.length === 0) return [];
  const hasAnyNonZero = items.some((i) => i.salience > 0);
  if (hasAnyNonZero) return [...items];
  return items.map((i) => ({ ...i, salience: NEUTRAL_SALIENCE }));
}

export function Canvas({
  onPresenceDotClick,
}: {
  onPresenceDotClick: () => void;
}) {
  const items = useUXStore((s) => s.items);
  const rendered = neutralize(items);
  const sessionId = useSessionId();
  const { addSignal } = useSignalCollector(sessionId);
  const { cardHandlers } = useCardSignals(addSignal);

  return (
    <main className="canvas-shell" data-zone="canvas">
      <CoverLetterPanel />
      <WhisperLayer />
      <Bento items={rendered} cardHandlers={cardHandlers} />
      <div className="canvas-chrome">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-[10px] text-ink-20">⌘K</span>
            <span className="block text-[9px] text-ink-20">
              Ask me anything
            </span>
          </div>
          <PresenceDot onClick={onPresenceDotClick} />
        </div>
      </div>
    </main>
  );
}
