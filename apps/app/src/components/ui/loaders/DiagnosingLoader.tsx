import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface DiagnosingLoaderProps {
  /** px width/height of the (square) loader. */
  size?: number;
  className?: string;
}

const TAU = Math.PI * 2;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * DiagnosingLoader — the "scan reticle" loader (loader #2).
 *
 * A carrot reticle — a slowly spinning ring with four corner brackets — around
 * a gently breathing, pulsing core. Used for Qarote's two *inspection* gestures:
 * a broker Connect & scan, and a streaming `explain_incident` diagnosis. (The
 * message-flow {@link FlowLoader} stays for broker *traffic* — test connection,
 * cockpit first load, boot.)
 *
 * Self-contained canvas + requestAnimationFrame (no external keyframes to get
 * out of sync), so it always animates once mounted. Reads its colour from the
 * `--primary` (carrot) token so it tracks light/dark; decorative (`aria-hidden`).
 * Pauses when the tab is hidden, re-layouts on resize, and under
 * `prefers-reduced-motion` paints a single static reticle (no rotation/pulse).
 */
export const DiagnosingLoader = ({
  size = 150,
  className,
}: DiagnosingLoaderProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const carrotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let dpr = Math.max(1, window.devicePixelRatio || 1);
    const layout = () => {
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    };

    const carrot = () =>
      (carrotRef.current && getComputedStyle(carrotRef.current).color) ||
      "#E8590C";

    const C = size / 2;
    const ringR = size * 0.4;
    const coreR = size * 0.13;
    const cornerD = size * 0.4; // distance from centre to a bracket corner
    const cornerLen = size * 0.1;
    const lw = Math.max(2, size * 0.018);

    let ringAngle = -Math.PI / 2; // bright arc starts at the top
    let coreT = 0;
    let breatheT = 0;

    const bracket = (sx: number, sy: number) => {
      const x = sx * cornerD;
      const y = sy * cornerD;
      ctx.beginPath();
      ctx.moveTo(x, y - sy * cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x - sx * cornerLen, y);
      ctx.stroke();
    };

    const draw = (animate: boolean) => {
      const color = carrot();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const breathe = animate
        ? 1 + 0.03 * (1 - Math.cos(breatheT * (TAU / 2.8)))
        : 1;
      ctx.translate(C, C);
      ctx.scale(breathe, breathe);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lw;

      // faint full ring (carrot-soft)
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, TAU);
      ctx.stroke();

      // bright rotating arc (the carrot "top" highlight)
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, ringAngle - 0.45, ringAngle + 0.45);
      ctx.stroke();

      // corner brackets
      ctx.globalAlpha = 0.9;
      bracket(-1, -1);
      bracket(1, -1);
      bracket(-1, 1);
      bracket(1, 1);

      // breathing/pulsing core
      const cp = animate ? 0.5 - 0.5 * Math.cos(coreT * (TAU / 1.4)) : 0.6; // 0..1
      const coreScale = 0.7 + 0.3 * cp;
      ctx.globalAlpha = 0.5 + 0.5 * cp;
      ctx.beginPath();
      ctx.arc(0, 0, coreR * coreScale, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    layout();

    if (prefersReducedMotion()) {
      draw(false);
      const roStatic = new ResizeObserver(() => {
        layout();
        draw(false);
      });
      roStatic.observe(canvas);
      return () => roStatic.disconnect();
    }

    let raf = 0;
    let last = 0;
    let running = true;
    const tick = (ts: number) => {
      if (!running) return;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      ringAngle += dt * TAU; // one rotation / second
      coreT += dt;
      breatheT += dt;
      draw(true);
      raf = requestAnimationFrame(tick);
    };

    draw(false); // synchronous first paint
    raf = requestAnimationFrame(tick);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const ro = new ResizeObserver(() => {
      layout();
      draw(false);
    });
    ro.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
    };
  }, [size]);

  return (
    <div className={cn("text-primary", className)} aria-hidden="true">
      {/* Off-screen probe so the canvas can read the carrot token colour. */}
      <span ref={carrotRef} className="sr-only text-primary" />
      <canvas ref={canvasRef} />
    </div>
  );
};
