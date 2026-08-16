import {
  CARROT_ASPECT,
  CARROT_DATA_URI,
  motifDataUri,
  SPARK_DATA_URI,
} from "./assets/marks.js";
import type { CardSeverity, CardSpec } from "./types.js";

// ── palette (hex, from the prototype social.css night family) ───────────────
const C = {
  night: "#0B0E14",
  nink: "#E7EAF0",
  nink2: "#9AA3B2",
  carrot: "#E8590C",
  red: "#E0503C",
  amber: "#D98A1F",
  good: "#3FBF7F",
  blue: "#2A6FDB",
} as const;

const FONT_DISPLAY = "Bricolage Grotesque";
const FONT_MONO = "Fragment Mono";

const SEV_COLOR: Record<CardSeverity, string> = {
  critical: C.red,
  high: C.red,
  medium: C.amber,
  low: C.blue,
};

// Minimal hyperscript — Satori accepts React-element-shaped objects, and this
// package has no JSX runtime, so we build the tree by hand.
type Node = { type: string; props: Record<string, unknown> };
const h = (
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
  extra?: Record<string, unknown>
): Node => ({ type, props: { style, children, ...extra } });

interface CardDimensions {
  width: number;
  height: number;
}

export function dimensions(spec: CardSpec): CardDimensions {
  return spec.format === "square"
    ? { width: 1200, height: 1200 }
    : { width: 1200, height: 630 };
}

// Shrink the title font when the headline is long so it never overflows the
// safe area (Satori wraps, but very long titles would clip vertically).
function titleSize(base: number, title: string): number {
  const len = title.length;
  if (len > 64) return Math.round(base * 0.62);
  if (len > 46) return Math.round(base * 0.76);
  if (len > 32) return Math.round(base * 0.88);
  return base;
}

// Split the title so the accent substring renders carrot. Returns inline spans.
function titleSpans(
  title: string,
  accent: string | undefined,
  size: number
): Node[] {
  const base = {
    fontFamily: FONT_DISPLAY,
    fontWeight: 600,
    fontSize: size,
    lineHeight: 1.02,
    letterSpacing: "-0.03em",
    color: C.nink,
  };
  const idx = accent ? title.indexOf(accent) : -1;
  if (accent && idx >= 0) {
    // Satori lays children out as flex items and trims each item's edge
    // whitespace, which would weld the accent to the preceding word. Pin the
    // boundary spaces with a non-breaking space so they survive.
    const before = title.slice(0, idx).replace(/ $/, " ");
    const after = title.slice(idx + accent.length).replace(/^ /, " ");
    const spans: Node[] = [];
    if (before) spans.push(h("span", { ...base }, before));
    spans.push(h("span", { ...base, color: C.carrot }, accent));
    if (after) spans.push(h("span", { ...base }, after));
    return spans;
  }
  return [h("span", { ...base }, title)];
}

export function buildCard(spec: CardSpec): Node {
  const { width, height } = dimensions(spec);
  const sq = spec.format === "square";
  const pad = sq ? 96 : 80;
  const url = spec.url ?? "qarote.io";

  // ── brand row ──
  // The mark is portrait (88:120): derive the width from the height so Satori
  // gets a box on the artwork's own ratio instead of a square that letterboxes.
  const markH = sq ? 60 : 46;
  const markW = Math.round(markH * CARROT_ASPECT);
  const brand = h(
    "div",
    { display: "flex", alignItems: "center", gap: sq ? 20 : 16 },
    [
      h("img", { width: markW, height: markH }, undefined, {
        src: CARROT_DATA_URI,
        width: markW,
        height: markH,
      }),
      h(
        "span",
        {
          fontFamily: FONT_DISPLAY,
          fontWeight: 600,
          fontSize: sq ? 54 : 40,
          letterSpacing: "-0.02em",
          color: "#ffffff",
        },
        "Qarote"
      ),
    ]
  );

  // ── body (varies by type) ──
  const bodyChildren: Node[] = [];

  if (spec.type === "rca") {
    const sevColor = SEV_COLOR[spec.severity ?? "critical"];
    bodyChildren.push(
      h(
        "div",
        {
          display: "flex",
          alignItems: "center",
          gap: sq ? 22 : 18,
          marginBottom: sq ? 28 : 22,
        },
        [
          h("div", {
            width: sq ? 22 : 18,
            height: sq ? 22 : 18,
            borderRadius: 999,
            backgroundColor: sevColor,
            boxShadow: `0 0 24px ${sevColor}`,
          }),
          h(
            "span",
            {
              fontFamily: FONT_MONO,
              fontSize: sq ? 30 : 24,
              color: C.nink2,
            },
            spec.finding ?? ""
          ),
        ]
      )
    );
    bodyChildren.push(
      h(
        "div",
        { display: "flex", flexWrap: "wrap" },
        titleSpans(spec.title, spec.accent, titleSize(sq ? 82 : 62, spec.title))
      )
    );
    bodyChildren.push(
      h(
        "div",
        {
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: sq ? 30 : 26,
        },
        [
          h("img", { width: sq ? 30 : 24, height: sq ? 30 : 24 }, undefined, {
            src: SPARK_DATA_URI,
            width: sq ? 30 : 24,
            height: sq ? 30 : 24,
          }),
          h(
            "span",
            { fontFamily: FONT_MONO, fontSize: sq ? 30 : 24, color: C.carrot },
            "Root-cause analysis by Qarote"
          ),
        ]
      )
    );
  } else {
    // default + page share the eyebrow / title / sub structure.
    const eyebrow =
      spec.eyebrow ?? (spec.type === "default" ? "Agent-first monitoring" : "");
    if (eyebrow) {
      bodyChildren.push(
        h(
          "div",
          {
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: sq ? 30 : 26,
          },
          [
            h("div", {
              width: 40,
              height: 2,
              backgroundColor: C.carrot,
            }),
            h(
              "span",
              {
                fontFamily: FONT_MONO,
                fontSize: sq ? 26 : 21,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: C.carrot,
              },
              eyebrow
            ),
          ]
        )
      );
    }
    bodyChildren.push(
      h(
        "div",
        { display: "flex", flexWrap: "wrap", maxWidth: sq ? 1000 : 900 },
        titleSpans(
          spec.title,
          spec.accent,
          titleSize(sq ? 104 : 82, spec.title)
        )
      )
    );
    if (spec.sub) {
      bodyChildren.push(
        h(
          "div",
          {
            fontFamily: FONT_DISPLAY,
            fontWeight: 400,
            fontSize: sq ? 40 : 32,
            color: C.nink2,
            marginTop: sq ? 36 : 28,
            maxWidth: sq ? 1000 : 880,
            lineHeight: 1.4,
          },
          spec.sub
        )
      );
    }
  }

  const body = h(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      flex: 1,
      justifyContent: "center",
    },
    bodyChildren
  );

  // ── footer ──
  const foot = h("div", { display: "flex", alignItems: "center" }, [
    h(
      "span",
      { fontFamily: FONT_MONO, fontSize: sq ? 32 : 26, color: C.nink2 },
      url
    ),
  ]);

  // ── layers: motif → scrim → content ──
  const motif = h(
    "img",
    {
      position: "absolute",
      top: 0,
      left: 0,
      width,
      height,
      opacity: 0.5,
    },
    undefined,
    { src: motifDataUri(width, height), width, height }
  );

  const scrim = h("div", {
    position: "absolute",
    top: 0,
    left: 0,
    width,
    height,
    backgroundImage:
      "linear-gradient(105deg, rgba(11,14,20,0.86) 0%, rgba(11,14,20,0.5) 55%, rgba(11,14,20,0.2) 100%)",
  });

  const content = h(
    "div",
    {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      width,
      height,
      padding: pad,
    },
    [brand, body, foot]
  );

  return h(
    "div",
    {
      display: "flex",
      width,
      height,
      position: "relative",
      backgroundColor: C.night,
    },
    [motif, scrim, content]
  );
}
