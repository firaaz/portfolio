export function FlowZone({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-4"
      style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr" }}
    >
      {children}
    </div>
  );
}
