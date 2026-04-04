import { useCallback, useEffect, useRef, useState } from "react";

export function useDwell(threshold = 2000, linger = 300) {
  const [dwellZone, setDwellZone] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lingerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (lingerTimerRef.current) {
      clearTimeout(lingerTimerRef.current);
      lingerTimerRef.current = null;
    }
  }, []);

  const handlers = useCallback(
    (zone: string) => ({
      onMouseEnter: () => {
        clearTimers();
        dwellRef.current = null;
        setDwellZone(null);
        hoverTimerRef.current = setTimeout(() => {
          dwellRef.current = zone;
          setDwellZone(zone);
        }, threshold);
      },
      onMouseLeave: () => {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }
        if (dwellRef.current) {
          lingerTimerRef.current = setTimeout(() => {
            dwellRef.current = null;
            setDwellZone(null);
          }, linger);
        }
      },
    }),
    [clearTimers, threshold, linger],
  );

  useEffect(() => clearTimers, [clearTimers]);

  return { dwellZone, handlers };
}
