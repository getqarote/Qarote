import { useEffect, useRef } from "react";

type NodeKind = "producer" | "exchange" | "queue" | "consumer";

type Node = {
  id: string;
  x: number;
  y: number;
  kind: NodeKind;
};

type Edge = {
  from: string;
  to: string;
  reverse: boolean;
  visible: boolean;
};

type Message = {
  edgeIndex: number;
  t: number;
  speed: number;
  hue: "primary" | "muted";
};

type Layout = {
  producers: Array<{ id: string; x: number; y: number }>;
  exchange: { id: string; x: number; y: number };
  queues: Array<{ id: string; x: number; y: number }>;
  consumers: Array<{ id: string; x: number; y: number }>;
};

const DESKTOP_LAYOUT: Layout = {
  producers: [
    { id: "p1", x: 0.08, y: 0.18 },
    { id: "p2", x: 0.08, y: 0.5 },
    { id: "p3", x: 0.08, y: 0.82 },
  ],
  exchange: { id: "ex", x: 0.28, y: 0.5 },
  queues: [{ id: "q1", x: 0.72, y: 0.5 }],
  consumers: [
    { id: "c1", x: 0.92, y: 0.18 },
    { id: "c2", x: 0.92, y: 0.5 },
    { id: "c3", x: 0.92, y: 0.82 },
  ],
};

const MOBILE_LAYOUT: Layout = {
  producers: [
    { id: "p1", x: 0.08, y: 0.25 },
    { id: "p2", x: 0.08, y: 0.75 },
  ],
  exchange: { id: "ex", x: 0.3, y: 0.5 },
  queues: [{ id: "q1", x: 0.7, y: 0.5 }],
  consumers: [
    { id: "c1", x: 0.92, y: 0.25 },
    { id: "c2", x: 0.92, y: 0.75 },
  ],
};

function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

const HeroBackgroundFlow = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes: Node[] = [];
    let edges: Edge[] = [];
    let messages: Message[] = [];
    let rafId = 0;
    let lastTs = 0;
    let spawnTimer = 0;

    const tokens = { primary: "", muted: "", bg: "" };
    function refreshTokens() {
      tokens.primary = `hsl(${readToken("--primary", "24 82% 52%")})`;
      tokens.muted = `hsl(${readToken("--muted-foreground", "25 8% 45%")})`;
      tokens.bg = `hsl(${readToken("--background", "0 0% 100%")})`;
    }
    refreshTokens();

    const isMobile = () => width < 640;

    function buildLayout() {
      const layout = isMobile() ? MOBILE_LAYOUT : DESKTOP_LAYOUT;
      nodes = [];
      edges = [];

      layout.producers.forEach((p) => {
        nodes.push({
          id: p.id,
          x: Math.round(width * p.x),
          y: Math.round(height * p.y),
          kind: "producer",
        });
      });

      nodes.push({
        id: layout.exchange.id,
        x: Math.round(width * layout.exchange.x),
        y: Math.round(height * layout.exchange.y),
        kind: "exchange",
      });

      layout.queues.forEach((q) => {
        nodes.push({
          id: q.id,
          x: Math.round(width * q.x),
          y: Math.round(height * q.y),
          kind: "queue",
        });
      });

      layout.consumers.forEach((c) => {
        nodes.push({
          id: c.id,
          x: Math.round(width * c.x),
          y: Math.round(height * c.y),
          kind: "consumer",
        });
      });

      // Forward visible edges: each producer → exchange
      layout.producers.forEach((p) => {
        edges.push({
          from: p.id,
          to: layout.exchange.id,
          reverse: false,
          visible: true,
        });
      });

      // Forward visible edges: exchange → every queue
      layout.queues.forEach((q) => {
        edges.push({
          from: layout.exchange.id,
          to: q.id,
          reverse: false,
          visible: true,
        });
      });

      // Forward visible edges: each queue feeds 1-2 consumers
      // Forward visible edges: queue → every consumer (mirror of producers→exchange)
      const q = layout.queues[0];
      layout.consumers.forEach((c) => {
        edges.push({
          from: q.id,
          to: c.id,
          reverse: false,
          visible: true,
        });
      });
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      refreshTokens();
      buildLayout();
      if (reduceMotion) drawStatic();
    }

    function nodeById(id: string) {
      return nodes.find((n) => n.id === id);
    }

    function edgeControlPoint(a: Node, b: Node, reverse: boolean) {
      // Bow the curve outward for reverse acks so they don't overlap forward path
      const cx = (a.x + b.x) / 2;
      const baseCy = (a.y + b.y) / 2;
      const offset = reverse ? (a.y < b.y ? -60 : 60) : (b.y - a.y) * 0.05;
      return { cx, cy: baseCy + offset };
    }

    function edgePoint(edge: Edge, t: number) {
      const a = nodeById(edge.from);
      const b = nodeById(edge.to);
      if (!a || !b) return { x: 0, y: 0 };
      const { cx, cy } = edgeControlPoint(a, b, edge.reverse);
      const u = 1 - t;
      const x = u * u * a.x + 2 * u * t * cx + t * t * b.x;
      const y = u * u * a.y + 2 * u * t * cy + t * t * b.y;
      return { x, y };
    }

    function spawnMessage() {
      if (edges.length === 0) return;
      const i = Math.floor(Math.random() * edges.length);
      messages.push({
        edgeIndex: i,
        t: 0,
        speed: 0.08 + Math.random() * 0.08,
        hue: Math.random() < 0.85 ? "primary" : "muted",
      });
      if (messages.length > 40) messages.shift();
    }

    function drawEdge(edge: Edge) {
      if (!edge.visible) return;
      const a = nodeById(edge.from);
      const b = nodeById(edge.to);
      if (!a || !b) return;
      const { cx, cy } = edgeControlPoint(a, b, edge.reverse);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cx, cy, b.x, b.y);
      ctx.strokeStyle = tokens.muted;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawNode(node: Node) {
      const r =
        node.kind === "exchange"
          ? 9
          : node.kind === "queue"
            ? 7
            : node.kind === "consumer"
              ? 6
              : 5;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = tokens.primary;
      ctx.globalAlpha = 0.06;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = tokens.bg;
      ctx.globalAlpha = 1;
      ctx.fill();

      ctx.strokeStyle =
        node.kind === "exchange" ? tokens.primary : tokens.muted;
      ctx.globalAlpha = node.kind === "exchange" ? 0.85 : 0.55;
      ctx.lineWidth = node.kind === "exchange" ? 1.75 : 1.25;
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (node.kind === "exchange") {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = tokens.primary;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    function drawMessage(m: Message) {
      const edge = edges[m.edgeIndex];
      if (!edge) return;
      const { x, y } = edgePoint(edge, m.t);
      const color = m.hue === "primary" ? tokens.primary : tokens.muted;
      const baseAlpha = edge.reverse ? 0.7 : 0.95;

      ctx.beginPath();
      ctx.arc(x, y, edge.reverse ? 6 : 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = edge.reverse ? 0.05 : 0.08;
      ctx.fill();

      const trail = edgePoint(edge, Math.max(0, m.t - 0.04));
      ctx.beginPath();
      ctx.moveTo(trail.x, trail.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = color;
      ctx.globalAlpha = edge.reverse ? 0.22 : 0.35;
      ctx.lineWidth = edge.reverse ? 1.5 : 2;
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, edge.reverse ? 1.6 : 2.2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = baseAlpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function drawStatic() {
      ctx.clearRect(0, 0, width, height);
      edges.forEach(drawEdge);
      nodes.forEach(drawNode);
    }

    function frame(ts: number) {
      const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
      lastTs = ts;

      spawnTimer += dt;
      const spawnInterval = isMobile() ? 1.2 : 0.75;
      while (spawnTimer >= spawnInterval) {
        spawnTimer -= spawnInterval;
        spawnMessage();
      }

      messages.forEach((m) => {
        m.t += m.speed * dt;
      });
      messages = messages.filter((m) => m.t < 1);

      ctx.clearRect(0, 0, width, height);
      edges.forEach(drawEdge);
      messages.forEach(drawMessage);
      nodes.forEach(drawNode);

      rafId = requestAnimationFrame(frame);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onVisibility = () => {
      if (reduceMotion) return;
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
      } else if (!rafId) {
        lastTs = 0;
        rafId = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduceMotion) {
      drawStatic();
    } else {
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-95 [mask-image:linear-gradient(to_right,transparent_0%,black_6%,black_94%,transparent_100%)]"
      />
      {/* Rectangular shield over the text region — solid core, blurred edge */}
      <div className="absolute left-1/2 top-[10%] h-[80%] w-[min(94%,64rem)] -translate-x-1/2 bg-background rounded-2xl shadow-[0_0_48px_24px_hsl(var(--background)),_0_0_96px_56px_hsl(var(--background)),_0_0_160px_80px_hsl(var(--background))]" />
    </div>
  );
};

export default HeroBackgroundFlow;
