import { useReducedMotion } from "../hooks/use-reduced-motion";

export function PresenceDot() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-label="AI agent active"
      role="status"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        width: "0.5rem",
        height: "0.5rem",
        borderRadius: "50%",
        backgroundColor: "currentColor",
        opacity: reduced ? 0.5 : undefined,
        animation: reduced ? "none" : "presence-pulse 3s ease-in-out infinite",
      }}
    />
  );
}
