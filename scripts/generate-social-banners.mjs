#!/usr/bin/env node
/**
 * Generates Twitter/X and LinkedIn profile banners using Playwright.
 * Run from repo root: node scripts/generate-social-banners.mjs
 *
 * Brand tokens mirror scripts/generate-compare-og.mjs (Bricolage Grotesque,
 * accent #FF691B, background #FEF8F4). Output PNGs land in
 * apps/web/public/images/ for manual upload to the social profiles.
 */
import { createRequire } from "module";
import { writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// Playwright is a dependency of apps/e2e, not the repo root. Resolve it from
// there relative to this script so the path is portable across machines.
const { chromium } = require(
  resolve(__dirname, "../apps/e2e/node_modules/@playwright/test"),
);

const OUT_DIR = resolve(__dirname, "../apps/web/public/images");

const logoSvg = readFileSync(resolve(OUT_DIR, "new_icon.svg"), "utf8");
const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

// Bricolage Grotesque woff2 — same URL used in apps/web/src/styles/index.css
const FONT_URL =
  "https://fonts.gstatic.com/s/bricolagegrotesque/v7/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PcbfFA.woff2";

const SHARED_CSS = `
  @font-face {
    font-family: "Bricolage Grotesque";
    font-style: normal;
    font-display: block;
    font-weight: 200 800;
    src: url("${FONT_URL}") format("woff2");
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
`;

/**
 * Twitter/X header — 1500x500.
 * The profile avatar overlaps the bottom-left ~220px on the profile page, so
 * primary copy stays vertically centred and clear of that corner.
 */
function buildTwitterHtml() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
${SHARED_CSS}
  body {
    width: 1500px; height: 500px;
    background: #FEF8F4;
    font-family: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;
    display: flex; align-items: stretch; overflow: hidden;
  }
  .sidebar { width: 14px; background: linear-gradient(180deg, #FF691B 0%, #FF6A00 100%); flex-shrink: 0; }
  .content { flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 56px 80px; }
  .top { display: flex; align-items: center; gap: 16px; }
  .logo-img { height: 56px; width: auto; }
  .brand-name { font-size: 30px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px; }
  .badge { margin-left: auto; background: rgba(234, 88, 12, 0.12); color: #CC4400; font-size: 17px; font-weight: 600; padding: 8px 18px; border-radius: 100px; letter-spacing: 0.2px; }
  .middle { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  h1 { font-size: 78px; font-weight: 800; color: #1a1a1a; line-height: 1.02; letter-spacing: -2.5px; margin-bottom: 22px; max-width: 1100px; }
  h1 .accent { color: #FF691B; }
  .subtitle { font-size: 28px; color: #6b6b6b; font-weight: 400; line-height: 1.4; letter-spacing: -0.2px; max-width: 1000px; }
  .bottom { display: flex; align-items: center; gap: 28px; padding-left: 240px; }
  .pill { display: flex; align-items: center; gap: 9px; font-size: 19px; color: #444; font-weight: 500; }
  .dot { width: 9px; height: 9px; background: #22c55e; border-radius: 50%; }
  .divider { width: 1px; height: 22px; background: #d1b89a; }
  .url { margin-left: auto; font-size: 20px; color: #a07050; font-weight: 500; letter-spacing: 0.2px; }
</style></head>
<body>
  <div class="sidebar"></div>
  <div class="content">
    <div class="top">
      <img src="${logoDataUrl}" class="logo-img" alt="Qarote" />
      <span class="brand-name">Qarote</span>
      <span class="badge">AI Diagnostics</span>
    </div>
    <div class="middle">
      <h1>Stop debugging <span class="accent">RabbitMQ</span> at 3&nbsp;AM</h1>
      <p class="subtitle">The AI that diagnoses your incidents and tells you exactly what to fix — no SRE required.</p>
    </div>
    <div class="bottom">
      <div class="pill"><div class="dot"></div>Open-source core</div>
      <div class="divider"></div>
      <div class="pill">Self-hosted</div>
      <div class="divider"></div>
      <div class="pill">Set up in 2 min</div>
      <span class="url">qarote.io</span>
    </div>
  </div>
</body></html>`;
}

/**
 * LinkedIn company banner — 1128x191 (ultra-wide, short). The company logo
 * overlaps the lower-left, so copy is single-line and centred-right.
 */
function buildLinkedInHtml() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
${SHARED_CSS}
  body {
    width: 1128px; height: 191px;
    background: #FEF8F4;
    font-family: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;
    display: flex; align-items: stretch; overflow: hidden;
  }
  .sidebar { width: 10px; background: linear-gradient(180deg, #FF691B 0%, #FF6A00 100%); flex-shrink: 0; }
  .content { flex: 1; display: flex; align-items: center; gap: 28px; padding: 0 56px 0 220px; }
  .logo-img { height: 40px; width: auto; flex-shrink: 0; }
  .headline { font-size: 38px; font-weight: 800; color: #1a1a1a; letter-spacing: -1px; line-height: 1.05; }
  .headline .accent { color: #FF691B; }
  .tagline { font-size: 19px; color: #6b6b6b; font-weight: 400; letter-spacing: -0.2px; margin-top: 5px; }
  .text { display: flex; flex-direction: column; }
  .url { margin-left: auto; font-size: 18px; color: #a07050; font-weight: 500; flex-shrink: 0; }
</style></head>
<body>
  <div class="sidebar"></div>
  <div class="content">
    <img src="${logoDataUrl}" class="logo-img" alt="Qarote" />
    <div class="text">
      <div class="headline">Stop debugging <span class="accent">RabbitMQ</span> at 3&nbsp;AM</div>
      <div class="tagline">The AI that diagnoses your incidents — no SRE required · Self-hosted</div>
    </div>
    <span class="url">qarote.io</span>
  </div>
</body></html>`;
}

const banners = [
  { html: buildTwitterHtml(), width: 1500, height: 500, out: "twitter-banner.png" },
  { html: buildLinkedInHtml(), width: 1128, height: 191, out: "linkedin-banner.png" },
];

const browser = await chromium.launch();
for (const banner of banners) {
  const context = await browser.newContext({
    viewport: { width: banner.width, height: banner.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.setContent(banner.html, { waitUntil: "networkidle" });
  // networkidle doesn't guarantee the webfont is painted — wait for it
  // explicitly so the screenshot never falls back to the system font.
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: banner.width, height: banner.height },
  });
  writeFileSync(resolve(OUT_DIR, banner.out), buf);
  console.log(`✓ ${banner.out} (${banner.width}x${banner.height})`);
  await context.close();
}
await browser.close();
console.log("Done.");
