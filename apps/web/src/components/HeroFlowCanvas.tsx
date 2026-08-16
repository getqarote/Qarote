/* ============================================================================
 * HeroFlowCanvas — the landing hero's animated message-flow graph.
 * Ported from docs/reference/HeroFlowCanvas.reference.tsx.
 * ----------------------------------------------------------------------------
 * Canvas 2D, ~12s loop: CALM → INCIDENT (a queue loses consumers, depth climbs,
 * node reddens) → AGENT (carrot reticle scans the bad node) → DIAGNOSIS (typed
 * root-cause panel) → RESET (picks a different queue next loop). Respects
 * prefers-reduced-motion (static end-frame), pauses off-screen, simplifies to 3
 * nodes < 720px. Decorative → aria-hidden. Colors hardcoded (fixed near-black
 * hero panel that doesn't theme); carrot #E8590C matches the token.
 * ==========================================================================*/

import { useEffect, useRef } from "react";

export default function HeroFlowCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const C = {
      edge: "rgba(154,163,178,0.16)",
      edgeHot: "rgba(232,89,12,0.55)",
      node: "rgba(231,234,240,0.55)",
      nodeFill: "rgba(255,255,255,0.02)",
      label: "rgba(154,163,178,0.7)",
      good: "#3FBF7F",
      amber: "#D98A1F",
      red: "#E0503C",
      carrot: "#E8590C",
    };
    const QUEUES = [
      {
        name: "orders.incoming",
        rca: "consumers dropped 15:06 · likely worker crash",
      },
      {
        name: "payments.capture",
        rca: "consumer stalled 02:41 · downstream timeout",
      },
      {
        name: "emails.outbound",
        rca: "no consumers since 19:12 · deploy drained pool",
      },
      {
        name: "webhooks.delivery",
        rca: "ack rate → 0 at 08:24 · poison message loop",
      },
    ];

    let W = 0,
      H = 0,
      dpr = 1,
      smallScreen = false;
    const nodes: Record<string, FlowNode> = {} as Record<string, FlowNode>;
    let edges: Edge[] = [];
    let queueNodes: QueueNode[] = [];
    let packets: Packet[] = [];

    interface FlowNode {
      x: number;
      y: number;
      r: number;
      kind: string;
      label?: string;
    }
    interface QueueNode extends FlowNode {
      name: string;
      rca: string;
      depth: number;
      glow: number;
      pile: number;
    }
    interface Edge {
      a: FlowNode;
      b: FlowNode;
    }
    interface Packet {
      t: number;
      seg: number;
      target: QueueNode;
      alpha: number;
      consumed: boolean;
    }

    function layout() {
      const rect = canvas!.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      smallScreen = W < 720;
      const nQ: number = smallScreen ? 3 : 4;
      const pubX = W * (smallScreen ? 0.16 : 0.4);
      const exX = W * (smallScreen ? 0.42 : 0.6);
      const qX = W * (smallScreen ? 0.8 : 0.84);
      const cy = H * 0.5;
      nodes.pub = { x: pubX, y: cy, r: 9, kind: "pub", label: "publisher" };
      nodes.ex = { x: exX, y: cy, r: 14, kind: "ex", label: "exchange" };
      queueNodes = [];
      const span = Math.min(H * 0.62, nQ * 86);
      const top = cy - span / 2;
      for (let i = 0; i < nQ; i++) {
        const y = nQ === 1 ? cy : top + (span / (nQ - 1)) * i;
        queueNodes.push({
          x: qX,
          y,
          r: 11,
          kind: "queue",
          name: QUEUES[i].name,
          rca: QUEUES[i].rca,
          depth: 0,
          glow: 0,
          pile: 0,
        });
      }
      edges = [{ a: nodes.pub, b: nodes.ex }];
      queueNodes.forEach((q) => edges.push({ a: nodes.ex, b: q }));
    }

    const CYCLE = 12000;
    const P = { CALM: 4000, INCIDENT: 6000, AGENT: 8000, DIAGNOSIS: 11000 };
    let incidentIdx = 0,
      lastEmit = 0,
      typed = 0,
      startT: number | null = null,
      running = true;
    let rafId: number | null = null;
    const reticle = { x: 0, y: 0, init: false };
    let prevTs = 0;
    const easeInOut = (x: number) =>
      x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    const pickIncident = (prev: number) => {
      let i;
      do {
        i = Math.floor(Math.random() * queueNodes.length);
      } while (i === prev && queueNodes.length > 1);
      return i;
    };
    const phaseOf = (t: number) =>
      t < P.CALM
        ? "calm"
        : t < P.INCIDENT
          ? "incident"
          : t < P.AGENT
            ? "agent"
            : t < P.DIAGNOSIS
              ? "diagnosis"
              : "reset";

    function update(t: number, dt: number) {
      const phase = phaseOf(t);
      const inc = queueNodes[incidentIdx];
      if (t - lastEmit > 300) {
        lastEmit = t;
        packets.push({
          t: 0,
          seg: 0,
          target: queueNodes[Math.floor(Math.random() * queueNodes.length)],
          alpha: 1,
          consumed: false,
        });
      }
      for (const p of packets) {
        if (p.consumed) {
          p.alpha -= dt * 0.004;
          continue;
        }
        p.t += dt * 0.0006;
        if (p.t >= 1) {
          p.t = 0;
          p.seg++;
          if (p.seg >= 2) {
            const isInc =
              p.target === inc &&
              (phase === "incident" ||
                phase === "agent" ||
                phase === "diagnosis");
            if (isInc) {
              inc.pile = Math.min(inc.pile + 1, 14);
              p.alpha = 0;
              p.consumed = true;
            } else {
              p.consumed = true;
              p.alpha = 1;
            }
          }
        }
      }
      packets = packets.filter((p) => p.alpha > 0.02);
      queueNodes.forEach((q, i) => {
        let tg = 0;
        if (i === incidentIdx && phase !== "calm" && phase !== "reset")
          tg = phase === "incident" ? 0.6 : 1;
        if (phase === "reset") tg = 0;
        q.glow += (tg - q.glow) * Math.min(1, dt * 0.004);
      });
      if (phase === "incident" || phase === "agent")
        inc.depth = Math.round(
          easeInOut(clamp01((t - P.CALM) / (P.AGENT - P.CALM))) * 52000
        );
      else if (phase === "diagnosis")
        inc.depth = 52000 + Math.round((t - P.AGENT) * 8);
      else if (phase === "reset") {
        inc.depth = Math.round(
          52000 *
            (1 - easeInOut(clamp01((t - P.DIAGNOSIS) / (CYCLE - P.DIAGNOSIS))))
        );
        inc.pile = Math.max(0, inc.pile - dt * 0.02);
      } else {
        inc.depth = 0;
        inc.pile = 0;
      }
      typed =
        phase === "diagnosis"
          ? clamp01((t - P.AGENT) / 1400)
          : phase === "reset"
            ? 1
            : 0;
    }

    function roundRect(x: number, y: number, w: number, h: number, r: number) {
      ctx!.beginPath();
      ctx!.moveTo(x + r, y);
      ctx!.arcTo(x + w, y, x + w, y + h, r);
      ctx!.arcTo(x + w, y + h, x, y + h, r);
      ctx!.arcTo(x, y + h, x, y, r);
      ctx!.arcTo(x, y, x + w, y, r);
      ctx!.closePath();
    }
    function drawNode(
      n: FlowNode,
      color: string,
      label: string,
      emph?: boolean
    ) {
      ctx!.beginPath();
      ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx!.fillStyle = C.nodeFill;
      ctx!.fill();
      ctx!.strokeStyle = color;
      ctx!.lineWidth = emph ? 1.8 : 1.2;
      ctx!.stroke();
      if (!smallScreen || n.kind === "queue") {
        ctx!.font = '11px "IBM Plex Mono", monospace';
        ctx!.textAlign = n.kind === "queue" ? "left" : "center";
        ctx!.fillStyle = emph ? "rgba(231,234,240,0.85)" : C.label;
        if (n.kind === "queue") ctx!.fillText(label, n.x + n.r + 8, n.y - 8);
        else ctx!.fillText(label, n.x, n.y + n.r + 16);
      }
    }
    function drawReticle(target: FlowNode, t: number) {
      if (!reticle.init) {
        reticle.x = W * 0.5;
        reticle.y = H * 0.5;
        reticle.init = true;
      }
      reticle.x += (target.x - reticle.x) * 0.18;
      reticle.y += (target.y - reticle.y) * 0.18;
      const R = 26;
      ctx!.save();
      ctx!.strokeStyle = C.carrot;
      ctx!.lineWidth = 1.6;
      const cs = 9;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        const cx = reticle.x + sx * R,
          cy = reticle.y + sy * R;
        ctx!.beginPath();
        ctx!.moveTo(cx - sx * cs, cy);
        ctx!.lineTo(cx, cy);
        ctx!.lineTo(cx, cy - sy * cs);
        ctx!.stroke();
      }
      ctx!.beginPath();
      const a0 = (t * 0.004) % (Math.PI * 2);
      ctx!.arc(reticle.x, reticle.y, R - 6, a0, a0 + Math.PI * 1.2);
      ctx!.strokeStyle = "rgba(232,89,12,0.6)";
      ctx!.lineWidth = 1.2;
      ctx!.stroke();
      const sweep = Math.sin(t * 0.006) * 0.5 + 0.5;
      const sx = reticle.x - R + sweep * R * 2;
      const grad = ctx!.createLinearGradient(sx - 6, 0, sx + 6, 0);
      grad.addColorStop(0, "rgba(232,89,12,0)");
      grad.addColorStop(0.5, "rgba(232,89,12,0.5)");
      grad.addColorStop(1, "rgba(232,89,12,0)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(sx - 6, reticle.y - R, 12, R * 2);
      ctx!.restore();
    }
    function drawRCA(target: QueueNode, t: number) {
      const full = `${target.name} · ${target.rca} ↓`;
      const shown = full.slice(0, Math.round(full.length * typed));
      ctx!.font = '12px "IBM Plex Mono", monospace';
      const padX = 12,
        padY = 9,
        lh = 16,
        maxW = Math.min(320, W * 0.5);
      const lines: string[] = [];
      let cur = "";
      for (const w of shown.split(" ")) {
        const test = cur ? cur + " " + w : w;
        if (ctx!.measureText(test).width > maxW - padX * 2 && cur) {
          lines.push(cur);
          cur = w;
        } else cur = test;
      }
      if (cur) lines.push(cur);
      const boxW = maxW,
        boxH = lines.length * lh + padY * 2 + 18;
      let bx = target.x + 26,
        by = target.y + 24;
      if (bx + boxW > W - 8) bx = target.x - boxW - 26;
      if (by + boxH > H - 8) by = H - 8 - boxH;
      ctx!.fillStyle = "rgba(11,14,20,0.92)";
      ctx!.strokeStyle = "rgba(232,89,12,0.45)";
      ctx!.lineWidth = 1;
      roundRect(bx, by, boxW, boxH, 8);
      ctx!.fill();
      ctx!.stroke();
      ctx!.font = '600 10px "IBM Plex Mono", monospace';
      ctx!.fillStyle = C.carrot;
      ctx!.textAlign = "left";
      ctx!.fillText("✦ ROOT CAUSE", bx + padX, by + padY + 9);
      ctx!.font = '12px "IBM Plex Mono", monospace';
      ctx!.fillStyle = "rgba(231,234,240,0.92)";
      lines.forEach((ln, i) =>
        ctx!.fillText(ln, bx + padX, by + padY + 26 + i * lh)
      );
      if (typed < 1 && lines.length) {
        const cw = ctx!.measureText(lines[lines.length - 1]).width;
        if (Math.floor(t / 400) % 2 === 0) {
          ctx!.fillStyle = C.carrot;
          ctx!.fillRect(
            bx + padX + cw + 2,
            by + padY + 16 + (lines.length - 1) * lh,
            6,
            13
          );
        }
      }
    }
    function draw(t: number) {
      const phase = phaseOf(t);
      const inc = queueNodes[incidentIdx];
      ctx!.clearRect(0, 0, W, H);
      for (const e of edges) {
        const hot = e.b === inc && phase === "agent";
        ctx!.beginPath();
        ctx!.moveTo(e.a.x, e.a.y);
        ctx!.lineTo(e.b.x, e.b.y);
        ctx!.strokeStyle = hot ? C.edgeHot : C.edge;
        ctx!.lineWidth = hot ? 1.6 : 1;
        if (hot) {
          ctx!.setLineDash([4, 4]);
          ctx!.lineDashOffset = -(t * 0.05) % 8;
        } else ctx!.setLineDash([]);
        ctx!.stroke();
        ctx!.setLineDash([]);
      }
      for (const p of packets) {
        const a = p.seg === 0 ? nodes.pub : nodes.ex,
          b = p.seg === 0 ? nodes.ex : p.target;
        ctx!.beginPath();
        ctx!.arc(
          a.x + (b.x - a.x) * p.t,
          a.y + (b.y - a.y) * p.t,
          2.4,
          0,
          Math.PI * 2
        );
        ctx!.fillStyle = `rgba(214,220,230,${0.85 * p.alpha})`;
        ctx!.fill();
      }
      drawNode(nodes.pub, C.node, "publisher");
      drawNode(nodes.ex, C.node, "exchange");
      queueNodes.forEach((q, i) => {
        const color =
          q.glow > 0.05 ? (q.glow < 0.55 ? C.amber : C.red) : C.node;
        if (q.glow > 0.05) {
          const g = ctx!.createRadialGradient(q.x, q.y, 0, q.x, q.y, 46);
          const col = q.glow < 0.55 ? "217,138,31" : "224,80,60";
          g.addColorStop(0, `rgba(${col},${0.28 * q.glow})`);
          g.addColorStop(1, `rgba(${col},0)`);
          ctx!.fillStyle = g;
          ctx!.beginPath();
          ctx!.arc(q.x, q.y, 46, 0, Math.PI * 2);
          ctx!.fill();
        }
        drawNode(q, color, q.name, q.glow > 0.05);
        if (q.pile > 0.5)
          for (let k = 0; k < Math.round(q.pile); k++) {
            ctx!.beginPath();
            ctx!.arc(
              q.x + 18 + (k % 4) * 6,
              q.y - 16 - Math.floor(k / 4) * 6,
              2.1,
              0,
              Math.PI * 2
            );
            ctx!.fillStyle = "rgba(224,80,60,0.85)";
            ctx!.fill();
          }
        if (i === incidentIdx && q.depth > 0) {
          ctx!.font = '600 12px "IBM Plex Mono", monospace';
          ctx!.textAlign = "left";
          const txt =
            q.depth >= 1000
              ? (q.depth / 1000).toFixed(1) + "k"
              : String(q.depth);
          ctx!.fillStyle = q.glow < 0.55 ? C.amber : C.red;
          ctx!.fillText("depth " + txt + " ↑", q.x + 18, q.y + 4);
        }
      });
      if (phase === "agent" || phase === "diagnosis") drawReticle(inc, t);
      if (phase === "diagnosis" || phase === "reset") drawRCA(inc, t);
    }

    let lastFrameTs = 0;
    function frame(ts: number) {
      if (!running) return;
      if (!startT) startT = ts;
      const t = (ts - startT) % CYCLE;
      if (t < prevTs) {
        incidentIdx = pickIncident(incidentIdx);
        reticle.init = false;
        packets = [];
      }
      const dt = Math.min(40, ts - (lastFrameTs || ts));
      lastFrameTs = ts;
      prevTs = t;
      update(t, dt);
      draw(t);
      rafId = requestAnimationFrame(frame);
    }
    const start = () => {
      if (!rafId && !reduce) {
        running = true;
        rafId = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      running = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
    function staticFrame() {
      incidentIdx = 0;
      const inc = queueNodes[incidentIdx];
      packets = [];
      for (let i = 0; i < 5; i++)
        packets.push({
          t: 0.3 + i * 0.1,
          seg: 1,
          target: queueNodes[1 + (i % (queueNodes.length - 1))],
          alpha: 0.8,
          consumed: false,
        });
      update(P.AGENT + 1500, 16);
      inc.glow = 1;
      inc.depth = 52340;
      inc.pile = 12;
      typed = 1;
      draw(P.AGENT + 1500);
    }

    layout();
    if (reduce) {
      staticFrame();
    } else {
      update(0, 16);
      draw(0); // synchronous first paint
      const heroEl = canvas.closest("section");
      if ("IntersectionObserver" in window && heroEl) {
        const io = new IntersectionObserver(
          (es) => es.forEach((e) => (e.isIntersecting ? start() : stop())),
          { threshold: 0.01 }
        );
        io.observe(heroEl);
      }
      start();
    }
    let rt: number;
    const onResize = () => {
      clearTimeout(rt);
      rt = window.setTimeout(() => {
        layout();
        if (reduce) staticFrame();
      }, 150);
    };
    const onVis = () => (document.hidden ? stop() : !reduce && start());
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  );
}
