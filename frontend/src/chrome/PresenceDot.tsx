import { useReducedMotion } from "../hooks/use-reduced-motion";

export function PresenceDot({ onClick }: { onClick: () => void }) {
  const reduced = useReducedMotion();

  return (
    <button
      type="button"
      aria-label="AI agent active"
      onClick={onClick}
      style={{
        width: "0.5rem",
        height: "0.5rem",
        borderRadius: "50%",
        backgroundColor: "oklch(0.6 0.12 230)",
        boxShadow: reduced ? "none" : "0 0 10px 2px oklch(0.6 0.12 230 / 0.4)",
        opacity: reduced ? 0.5 : undefined,
        animation: reduced ? "none" : "presence-pulse 3s ease-in-out infinite",
        border: "none",
        padding: 0,
        cursor: "pointer",
        flexShrink: 0,
      }}
    />
  );
}
