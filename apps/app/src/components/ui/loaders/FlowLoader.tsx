import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface FlowLoaderProps {
  /** px width of the loader; height tracks the graph aspect ratio. */
  size?: number;
  className?: string;
}

// Logical graph layout (CSS px); the canvas is drawn at this size and scaled
// for device pixel ratio. publisher → exchange → four queues.
const W = 200;
const H = 128;
const PUB = { x: 22, y: H / 2 };
const EXC = { x: 100, y: H / 2 };
const QUEUES = [16, 48, 80, 112].map((y) => ({ x: 178, y }));
const NODE_R = 7;
const TRAVEL = 1.9; // seconds for a packet to cross the whole path
const SPAWN = 0.6; // seconds between packet spawns

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + s, y, x + s, y + s, r);
  ctx.arcTo(x + s, y + s, x, y + s, r);
  ctx.arcTo(x, y + s, x, y, r);
  ctx.arcTo(x, y, x + s, y, r);
  ctx.closePath();
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/**
 * FlowLoader — the "message flow" signature loader (broker I/O).
 *
 * A compact canvas mini-graph: packets glide publisher → exchange → queues in
 * a continuous, calm stream, and each queue's green dot gives a gentle pulse on
 * arrival. Neutral by design — there is no red/incident beat here (that's
 * reserved for the auth/landing graph); the scan is just discovering the broker.
 *
 * Theme-aware: the canvas reads its colours from computed `text-*` tokens
 * (muted for the flow, success for the queue dots), so it tracks light/dark
 * with no hardcoded hex. Decorative (`aria-hidden`) — meaning lives in the
 * surrounding headline + checklist. Motion pauses when the tab is hidden and
 * re-layouts on resize. Under `prefers-reduced-motion` it paints a single
 * static frame (packets parked mid-flow, dots at rest) and never animates.
 */
export const FlowLoader = ({ size = 200, className }: FlowLoaderProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const goodRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const height = (size * H) / W;
    let dpr = Math.max(1, window.devicePixelRatio || 1);

    const layout = () => {
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${height}px`;
    };

    const colorOf = (el: HTMLElement | null, fallback: string) =>
      el ? getComputedStyle(el).color || fallback : fallback;

    type Packet = { q: number; t: number };
    const packets: Packet[] = [];
    const pulses = QUEUES.map(() => 0);
    let sinceSpawn = SPAWN; // spawn one on the first update
    let nextQ = 0;

    const position = (p: Packet) => {
      if (p.t < 0.5) {
        const u = p.t / 0.5;
        return { x: lerp(PUB.x, EXC.x, u), y: lerp(PUB.y, EXC.y, u) };
      }
      const u = (p.t - 0.5) / 0.5;
      const q = QUEUES[p.q];
      return { x: lerp(EXC.x, q.x, u), y: lerp(EXC.y, q.y, u) };
    };

    const draw = (dt: number, fade: boolean) => {
      const muted = colorOf(canvas, "#888");
      const good = colorOf(goodRef.current, "#3aa657");

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // edges
      ctx.strokeStyle = muted;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.moveTo(PUB.x, PUB.y);
      ctx.lineTo(EXC.x, EXC.y);
      for (const q of QUEUES) {
        ctx.moveTo(EXC.x, EXC.y);
        ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // nodes (thin outline)
      ctx.strokeStyle = muted;
      ctx.beginPath();
      ctx.arc(PUB.x, PUB.y, NODE_R, 0, Math.PI * 2);
      ctx.stroke();
      const s = 13;
      roundRect(ctx, EXC.x - s / 2, EXC.y - s / 2, s, 3);
      ctx.stroke();
      for (const q of QUEUES) {
        ctx.beginPath();
        ctx.arc(q.x, q.y, NODE_R, 0, Math.PI * 2);
        ctx.stroke();
      }

      // queue green dots — calm + steady, gentle pulse on arrival
      QUEUES.forEach((q, i) => {
        const pulse = pulses[i];
        const r = 2.4 + pulse * 1.6;
        ctx.fillStyle = good;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (pulse > 0.01) {
          ctx.globalAlpha = pulse * 0.22;
          ctx.beginPath();
          ctx.arc(q.x, q.y, r + 4, 0, Math.PI * 2);
          ctx.fill();
        }
        if (fade) pulses[i] = Math.max(0, pulse - dt * 2.2);
      });
      ctx.globalAlpha = 1;

      // packets gliding along the path
      ctx.fillStyle = muted;
      for (const p of packets) {
        const { x, y } = position(p);
        const fadeIn = Math.min(1, p.t / 0.08);
        const fadeOut = Math.min(1, (1 - p.t) / 0.12);
        ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut));
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const update = (dt: number) => {
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        const prev = p.t;
        p.t += dt / TRAVEL;
        if (prev < 0.95 && p.t >= 0.95) pulses[p.q] = 1; // arrival pulse
        if (p.t >= 1) packets.splice(i, 1);
      }
      sinceSpawn += dt;
      if (sinceSpawn >= SPAWN) {
        sinceSpawn -= SPAWN;
        packets.push({ q: nextQ % QUEUES.length, t: 0 });
        nextQ += 1;
      }
    };

    layout();

    if (prefersReducedMotion()) {
      // Static frame: one packet parked mid-flow toward each queue, dots at rest.
      QUEUES.forEach((_, i) => packets.push({ q: i, t: 0.72 }));
      draw(0, false);
      const roStatic = new ResizeObserver(() => {
        layout();
        draw(0, false);
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
      update(dt);
      draw(dt, true);
      raf = requestAnimationFrame(tick);
    };

    draw(0, false); // synchronous first paint
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
      draw(0, false);
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
    <div className={cn("text-muted-foreground", className)} aria-hidden="true">
      {/* Off-screen probe so the canvas can read the success token colour. */}
      <span ref={goodRef} className="sr-only text-success" />
      <canvas ref={canvasRef} />
    </div>
  );
};
