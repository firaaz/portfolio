export function FlowZone({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.6fr 1fr",
        gap: "1rem",
      }}
    >
      {children}
    </div>
  );
}
