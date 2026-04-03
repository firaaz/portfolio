/**
 * Command bar overlay — Cmd+K to open, type natural-language requests.
 */
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { useCommandBar } from "../hooks/use-command-bar";

export function CommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const { submitCommand } = useCommandBar();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;
      submitCommand(trimmed);
      setInput("");
      setIsOpen(false);
    },
    [input, submitCommand],
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent aria-label="Command bar" showCloseButton={false}>
        <form onSubmit={handleSubmit}>
          <Input
            placeholder="Ask about my experience..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
