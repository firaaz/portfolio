import { Canvas } from "./canvas/Canvas";
import { CommandBar } from "./chrome/CommandBar";
import { useAgentStream } from "./hooks/use-agent-stream";

export default function App() {
  useAgentStream();
  return (
    <>
      <Canvas />
      <CommandBar />
    </>
  );
}
