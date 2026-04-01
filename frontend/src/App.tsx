import { Canvas } from "./canvas/Canvas";
import { useAgentStream } from "./hooks/use-agent-stream";

export default function App() {
  useAgentStream();
  return <Canvas />;
}
