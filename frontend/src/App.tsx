import { useState } from "react";
import { Canvas } from "./canvas/Canvas";
import { CommandBar } from "./chrome/CommandBar";
import { TransparencyPanel } from "./chrome/TransparencyPanel";
import { useAgentStream } from "./hooks/use-agent-stream";

export default function App() {
  const [panelOpen, setPanelOpen] = useState(false);
  useAgentStream();
  return (
    <>
      <Canvas onPresenceDotClick={() => setPanelOpen(true)} />
      <CommandBar />
      <TransparencyPanel open={panelOpen} onOpenChange={setPanelOpen} />
    </>
  );
}
