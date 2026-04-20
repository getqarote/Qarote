#!/usr/bin/env node
/**
 * Generates OG images for comparison pages using Playwright.
 * Run from repo root: node scripts/generate-compare-og.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/brice/Code/Personal/Active/Qarote/apps/e2e/node_modules/@playwright/test");
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../apps/web/public/images");

const cards = [
  {
    title: "Qarote vs Datadog",
    subtitle: "RabbitMQ-native monitoring · Free & open-source core · Self-hosted",
    badge: "Datadog Alternative",
    accent: "#EA580C",
    out: "compare-datadog-card.jpg",
  },
  {
    title: "Qarote vs Grafana + Prometheus",
    subtitle: "Purpose-built for RabbitMQ · No assembly required · MIT licensed",
    badge: "Grafana Alternative",
    accent: "#EA580C",
    out: "compare-grafana-card.jpg",
  },
];

function buildHtml({ title, subtitle, badge, accent }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

  body {
    width: 1200px;
    height: 630px;
    background: #FFECE2;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    display: flex;
    align-items: stretch;
    overflow: hidden;
  }

  .sidebar {
    width: 12px;
    background: linear-gradient(180deg, #EA580C 0%, #DC2626 100%);
    flex-shrink: 0;
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 64px 72px 56px;
  }

  .top {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .logo-mark {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, #EA580C 0%, #DC2626 100%);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 5px;
    padding: 10px 10px 8px;
    border-radius: 4px;
  }

  .bar {
    background: white;
    border-radius: 2px;
  }

  .bar-tall { width: 10px; height: 24px; }
  .bar-short { width: 10px; height: 16px; }

  .brand-name {
    font-size: 26px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: -0.5px;
  }

  .badge {
    margin-left: auto;
    background: rgba(234, 88, 12, 0.12);
    color: #C2410C;
    font-size: 14px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 100px;
    letter-spacing: 0.2px;
  }

  .middle {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0;
  }

  h1 {
    font-size: 62px;
    font-weight: 800;
    color: #1a1a1a;
    line-height: 1.05;
    letter-spacing: -2px;
    margin-bottom: 24px;
    max-width: 900px;
  }

  h1 .vs {
    color: #EA580C;
  }

  .subtitle {
    font-size: 22px;
    color: #6b6b6b;
    font-weight: 400;
    line-height: 1.5;
    letter-spacing: -0.2px;
  }

  .bottom {
    display: flex;
    align-items: center;
    gap: 32px;
  }

  .pill {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    color: #444;
    font-weight: 500;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: #22c55e;
    border-radius: 50%;
  }

  .divider {
    width: 1px;
    height: 20px;
    background: #d1b89a;
  }

  .url {
    margin-left: auto;
    font-size: 16px;
    color: #a07050;
    font-weight: 500;
    letter-spacing: 0.2px;
  }
</style>
</head>
<body>
  <div class="sidebar"></div>
  <div class="content">
    <div class="top">
      <div class="logo-mark">
        <div class="bar bar-tall"></div>
        <div class="bar bar-short"></div>
      </div>
      <span class="brand-name">Qarote</span>
      <span class="badge">${badge}</span>
    </div>

    <div class="middle">
      <h1>${title.replace(" vs ", ' <span class="vs">vs</span> ')}</h1>
      <p class="subtitle">${subtitle}</p>
    </div>

    <div class="bottom">
      <div class="pill">
        <div class="dot"></div>
        Free &amp; Open Source
      </div>
      <div class="divider"></div>
      <div class="pill">Self-Hosted</div>
      <div class="divider"></div>
      <div class="pill">RabbitMQ Native</div>
      <span class="url">qarote.io</span>
    </div>
  </div>
</body>
</html>`;
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1200, height: 630 } });

for (const card of cards) {
  const page = await context.newPage();
  await page.setContent(buildHtml(card), { waitUntil: "networkidle" });
  const buf = await page.screenshot({ type: "jpeg", quality: 92, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  const outPath = resolve(OUT_DIR, card.out);
  writeFileSync(outPath, buf);
  console.log(`✓ ${card.out}`);
  await page.close();
}

await browser.close();
console.log("Done.");
