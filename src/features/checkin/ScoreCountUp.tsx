/**
 * ScoreCountUp — animated number counting from `from` to `to`.
 *
 * Used for the celebratory "before → after" points moment after check-ins:
 * the MysteryBox reveal and the joint check-in done card share this one
 * component (no duplicated animation logic).
 */
import React, { useState, useEffect, useRef } from "react";

interface ScoreCountUpProps {
  from: number;
  to: number;
  /** Animation length in ms. Defaults to 1500. */
  durationMs?: number;
  className?: string;
}

export const ScoreCountUp: React.FC<ScoreCountUpProps> = ({
  from,
  to,
  durationMs = 1500,
  className,
}) => {
  const [display, setDisplay] = useState(from);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    setDisplay(from);
    if (from === to) return;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // Ease-out so the landing feels celebratory, not mechanical.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [from, to, durationMs]);

  return <span className={className}>{display.toLocaleString()}</span>;
};
