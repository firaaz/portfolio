import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { useAuditStore } from "../store/audit-store";

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function TransparencyPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const decisions = useAuditStore((s) => s.decisions);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Agent Decisions</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decisions yet</p>
          ) : (
            <ul className="space-y-3">
              {decisions.map((d) => (
                <li
                  key={`${d.timestamp}-${d.referrer_type}`}
                  className="rounded-md border border-border/50 p-3"
                >
                  <p className="text-sm">{d.reasoning}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatTime(d.timestamp)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
