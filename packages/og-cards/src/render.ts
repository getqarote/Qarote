import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

import { BRICOLAGE_REGULAR_TTF_B64 } from "./assets/font-bricolage-regular.js";
import { BRICOLAGE_TTF_B64 } from "./assets/font-bricolage.js";
import { FRAGMENT_MONO_TTF_B64 } from "./assets/font-fragment-mono.js";
import { buildCard, dimensions } from "./layout.js";
import type { CardSpec } from "./types.js";

// Static instances cut from the Bricolage Grotesque variable font (Satori /
// fontkit choke on variable fonts): SemiBold (600) for display, Regular (400)
// for sub copy. Fragment Mono covers eyebrow / url / finding lines.
const bricolageSemibold = Buffer.from(BRICOLAGE_TTF_B64, "base64");
const bricolageRegular = Buffer.from(BRICOLAGE_REGULAR_TTF_B64, "base64");
const fragmentMono = Buffer.from(FRAGMENT_MONO_TTF_B64, "base64");

const FONTS = [
  {
    name: "Bricolage Grotesque",
    data: bricolageRegular,
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "Bricolage Grotesque",
    data: bricolageSemibold,
    weight: 600 as const,
    style: "normal" as const,
  },
  {
    name: "Fragment Mono",
    data: fragmentMono,
    weight: 400 as const,
    style: "normal" as const,
  },
];

/** Render a social card to an SVG string. */
export async function renderCardSvg(spec: CardSpec): Promise<string> {
  const { width, height } = dimensions(spec);
  // Satori accepts React-element-shaped objects; our buildCard returns that.
  return satori(buildCard(spec) as unknown as Parameters<typeof satori>[0], {
    width,
    height,
    fonts: FONTS,
  });
}

/** Render a social card to a PNG buffer (the canonical OG/Twitter image). */
export async function renderCard(spec: CardSpec): Promise<Buffer> {
  const svg = await renderCardSvg(spec);
  const { width } = dimensions(spec);
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();
  return Buffer.from(png);
}
