import { useEffect, useState } from "react";

interface CountUpProps {
  /** Target value to count to. Re-renders the animation if changed. */
  to: number;
  /** Total animation duration in ms. Defaults to 400. */
  durationMs?: number;
  /** Optional className passed to the wrapping <span>. */
  className?: string;
}

/**
 * Animates a number from 0 to `to` over `durationMs` using requestAnimationFrame.
 *
 * Used in the scan reveal fingerprint strip — the count-up is the cheapest
 * way to signal "we just measured this in real time, not a placeholder".
 * Respects `prefers-reduced-motion` by snapping straight to the final value.
 */
export function CountUp({ to, durationMs = 400, className }: CountUpProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (to <= 0) {
      setValue(0);
      return;
    }

    // Snap to target when the caller passed a non-positive duration. The
    // progress calc inside tick would otherwise divide by zero (or by a
    // negative); cheaper and safer to short-circuit before scheduling
    // any rAF work.
    if (durationMs <= 0) {
      setValue(to);
      return;
    }

    // Honour reduced-motion preference — count-up is decoration, not signal.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(to);
      return;
    }

    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // easeOutCubic — fast start, gentle landing
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(to * eased));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [to, durationMs]);

  return <span className={className}>{value}</span>;
}
