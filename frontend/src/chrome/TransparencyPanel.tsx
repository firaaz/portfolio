import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { type ActivityEntry, useAuditStore } from "../store/audit-store";
import {
  type PersonaObservation,
  setInferenceDisabled,
  usePersonaStore,
} from "../store/persona-store";

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function withStableKeys(
  observations: PersonaObservation[],
): { key: string; obs: PersonaObservation }[] {
  const seen = new Map<string, number>();
  return observations.map((obs) => {
    const base = `${obs.ts}-${obs.dimension}-${obs.value}`;
    const seq = seen.get(base) ?? 0;
    seen.set(base, seq + 1);
    return { key: seq === 0 ? base : `${base}-${seq}`, obs };
  });
}

const ACTIVITY_GLYPH: Record<ActivityEntry["kind"], string> = {
  decision: "◆",
  persona: "●",
  voice: "▲",
};

function withActivityKeys(
  entries: ActivityEntry[],
): { key: string; entry: ActivityEntry }[] {
  const seen = new Map<string, number>();
  return entries.map((entry) => {
    const base = `${entry.timestamp}-${entry.kind}`;
    const seq = seen.get(base) ?? 0;
    seen.set(base, seq + 1);
    return { key: seq === 0 ? base : `${base}-${seq}`, entry };
  });
}

function ActivityBody({ entry }: { entry: ActivityEntry }) {
  if (entry.kind === "decision") {
    return <p className="text-sm">{entry.reasoning}</p>;
  }
  if (entry.kind === "persona") {
    return (
      <>
        <p className="text-sm">{entry.rationale}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          trust {entry.trust.toFixed(2)} · {entry.observation_count} observation
          {entry.observation_count === 1 ? "" : "s"}
        </p>
      </>
    );
  }
  return (
    <>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {entry.voice_tag}
      </p>
      <p className="text-sm">{entry.content}</p>
    </>
  );
}

export function TransparencyPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const activities = useAuditStore((s) => s.activities);
  const persona = usePersonaStore((s) => s);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>What the agent thinks of you</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
          <section aria-label="Inference control">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={persona.inferenceDisabled}
                onChange={(e) => setInferenceDisabled(e.target.checked)}
              />
              <span>Do not infer my persona</span>
            </label>
          </section>
          <section aria-label="Persona">
            {persona.observations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The agent has not formed a read yet.
              </p>
            ) : (
              <>
                <p className="text-sm">{persona.rationale}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  trust {persona.trust.toFixed(2)}
                </p>
                <ul className="mt-3 space-y-2">
                  {withStableKeys(persona.observations).map(({ key, obs }) => (
                    <li
                      key={key}
                      className="rounded-md border border-border/50 p-2"
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {obs.dimension}
                      </p>
                      <p className="text-sm">
                        {obs.value}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({obs.confidence.toFixed(2)})
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {obs.rationale}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
          {activities.length > 0 && (
            <section aria-label="Activity">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground">
                Activity
              </h3>
              <ul className="mt-2 space-y-3">
                {withActivityKeys(activities).map(({ key, entry }) => (
                  <li
                    key={key}
                    className="rounded-md border border-border/50 p-3"
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      <span aria-hidden="true">
                        {ACTIVITY_GLYPH[entry.kind]}
                      </span>{" "}
                      {entry.kind}
                    </p>
                    <div className="mt-1">
                      <ActivityBody entry={entry} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(entry.timestamp)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
