// Vector marks baked into the social cards: the carrot-cursor brand mark and
// the discreet topology motif (message-flow nodes/edges). Both are inlined as
// data URIs so the renderer needs no network and no asset-copy step.

// Same artwork as the apps' /images/new_icon.svg. Portrait 88:120 — callers
// must size the <img> on that ratio (see CARROT_ASPECT) or it renders boxy.
const CARROT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 120" fill="none"><rect x="30" y="0" width="12" height="26" rx="6" fill="#43BF00"/><rect x="48" y="4" width="12" height="18" rx="6" fill="#43BF00" transform="rotate(18 54 13)"/><path d="M12 36 H76 L44 116 Z" fill="#E8590C"/><path d="M12 36 H44 V116 Z" fill="#FF871F"/></svg>';

/** Width / height of the brand mark. Multiply a target height by this. */
export const CARROT_ASPECT = 88 / 120;

const toDataUri = (svg: string): string =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

export const CARROT_DATA_URI = toDataUri(CARROT_SVG);

// Carrot four-point sparkle — stands in for ✨ on the RCA line (Satori can't
// render emoji without an emoji font).
const SPARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#E8590C" d="M12 0c.7 5.6 5.7 10.6 12 12-6.3 1.4-11.3 6.4-12 12-.7-5.6-5.7-10.6-12-12C6.3 10.6 11.3 5.6 12 0z"/></svg>';

export const SPARK_DATA_URI = toDataUri(SPARK_SVG);

// Topology motif from the prototype (docs/reference Qarote Social Cards). Drawn
// in a 1200×630 coordinate space; sliced to fill whichever card size we render.
// One node is carrot, one is red — the rest green — to echo a live flow graph.
function motifSvg(width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1200 630" preserveAspectRatio="xMidYMid slice" fill="none">
  <g stroke="#2A3242" stroke-width="2">
    <line x1="760" y1="150" x2="920" y2="120"/><line x1="760" y1="150" x2="940" y2="230"/>
    <line x1="760" y1="150" x2="930" y2="340"/><line x1="600" y1="320" x2="760" y2="150"/>
    <line x1="600" y1="320" x2="780" y2="430"/><line x1="600" y1="320" x2="820" y2="520"/>
  </g>
  <g>
    <circle cx="600" cy="320" r="16" fill="#11151E" stroke="#3A4456" stroke-width="2"/>
    <circle cx="760" cy="150" r="20" fill="#11151E" stroke="#3A4456" stroke-width="2"/>
    <circle cx="920" cy="120" r="13" fill="#11151E" stroke="#3FBF7F" stroke-width="2"/>
    <circle cx="940" cy="230" r="13" fill="#11151E" stroke="#3FBF7F" stroke-width="2"/>
    <circle cx="930" cy="340" r="13" fill="#11151E" stroke="#E8590C" stroke-width="2.5"/>
    <circle cx="780" cy="430" r="13" fill="#11151E" stroke="#3FBF7F" stroke-width="2"/>
    <circle cx="820" cy="520" r="13" fill="#11151E" stroke="#3FBF7F" stroke-width="2"/>
  </g>
  <g fill="#C6CCD6">
    <circle cx="680" cy="235" r="4"/><circle cx="840" cy="135" r="4"/><circle cx="850" cy="190" r="4"/><circle cx="700" cy="375" r="4"/>
  </g>
</svg>`;
}

export function motifDataUri(width: number, height: number): string {
  return toDataUri(motifSvg(width, height));
}
