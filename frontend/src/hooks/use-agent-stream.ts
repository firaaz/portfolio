import { useEffect } from "react";
import { addPersonaActivity, addVoiceActivity } from "../store/audit-store";
import { applyPersonaDelta } from "../store/persona-store";
import { useUXStore } from "../store/ux-store";
import { addUtterance, useVoiceStore } from "../store/voice-store";
import { isPersonaDelta, isVoiceUtterance } from "./sse-parsers";
import { useSessionId } from "./use-session-id";
import {
  isUXAgency,
  isUXBridge,
  isUXFocus,
  isUXRecede,
  isUXSalience,
  isUXSignal,
  isUXSnapshot,
  isUXSurface,
  isUXTempo,
} from "./ux-parsers";

export function useAgentStream(url = "/api/agent/stream") {
  const sessionId = useSessionId();
  const setSnapshot = useUXStore((s) => s.setSnapshot);
  const applySalience = useUXStore((s) => s.applySalience);
  const setTempo = useUXStore((s) => s.setTempo);
  const setAgency = useUXStore((s) => s.setAgency);
  const applyFocus = useUXStore((s) => s.applyFocus);
  const applyRecede = useUXStore((s) => s.applyRecede);
  const applySurface = useUXStore((s) => s.applySurface);
  const addBridge = useUXStore((s) => s.addBridge);

  useEffect(() => {
    const fullUrl = `${url}?session_id=${encodeURIComponent(sessionId)}`;
    const source = new EventSource(fullUrl);

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const data: unknown = JSON.parse(event.data);
        if (isUXSnapshot(data)) {
          setSnapshot(data.snapshot);
        } else if (isUXSalience(data)) {
          applySalience(data.custom.items);
        } else if (isUXTempo(data)) {
          setTempo(data.custom.value);
        } else if (isUXAgency(data)) {
          setAgency(data.custom.value);
        } else if (isUXFocus(data)) {
          applyFocus(
            data.custom.item_id,
            data.custom.importance,
            data.custom.emphasis,
          );
        } else if (isUXRecede(data)) {
          applyRecede(data.custom.item_id, data.custom.importance);
        } else if (isUXBridge(data)) {
          addBridge(
            data.custom.source_id,
            data.custom.target_id,
            data.custom.text,
          );
        } else if (isUXSurface(data)) {
          applySurface(data.custom.item_id, data.custom.generated);
        } else if (isUXSignal(data)) {
          // Signal events — confidence/reasoning available for transparency panel
        } else if (isPersonaDelta(data)) {
          applyPersonaDelta({
            rationale: data.custom.rationale,
            trust: data.custom.trust,
            observations_added: data.custom.observations_added,
            ts: data.custom.ts,
          });
          addPersonaActivity({
            rationale: data.custom.rationale ?? "",
            trust: data.custom.trust ?? 0,
            observation_count: data.custom.observations_added.length,
            timestamp: data.custom.ts ?? new Date().toISOString(),
          });
        } else if (isVoiceUtterance(data)) {
          addUtterance({
            voice_tag: data.custom.voice_tag,
            utterance_kind: data.custom.utterance_kind,
            content: data.custom.content,
            references: data.custom.references ?? [],
          });
          useVoiceStore.getState().setActiveVoice(data.custom.voice_tag);
          addVoiceActivity({
            voice_tag: data.custom.voice_tag,
            utterance_kind: data.custom.utterance_kind,
            content: data.custom.content,
            timestamp: new Date().toISOString(),
          });
        }
      } catch {
        // Ignore malformed events
      }
    };

    return () => {
      source.close();
    };
  }, [
    url,
    sessionId,
    setSnapshot,
    applySalience,
    setTempo,
    setAgency,
    applyFocus,
    applyRecede,
    applySurface,
    addBridge,
  ]);
}
