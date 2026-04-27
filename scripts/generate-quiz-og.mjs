#!/usr/bin/env node
/**
 * Generates OG images for the RabbitMQ Skills Assessment quiz pages.
 * Run from repo root: node scripts/generate-quiz-og.mjs
 */
import { createRequire } from "node:module";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(__dirname, "../apps/e2e/node_modules/@playwright/test"));

const OUT_DIR = resolve(__dirname, "../apps/web/public/images");

const logoSvg = readFileSync(resolve(OUT_DIR, "new_icon.svg"), "utf8");
const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

const FONT_URL =
  "https://fonts.gstatic.com/s/bricolagegrotesque/v7/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PcbfFA.woff2";

const cards = [
  {
    tier: null,
    badge: "Free Assessment",
    badgeBg: "rgba(234, 88, 12, 0.12)",
    badgeColor: "#CC4400",
    title: "RabbitMQ Skills Assessment",
    subtitle: "20 questions · Beginner to Advanced · Get your tier verdict",
    accentColor: "#FF691B",
    dotColor: "#FF691B",
    out: "og-quiz-default.jpg",
  },
  {
    tier: "Reactive",
    badge: "Reactive Tier",
    badgeBg: "rgba(220, 38, 38, 0.1)",
    badgeColor: "#991B1B",
    title: "RabbitMQ Skills Assessment",
    subtitle: "You're finding out about problems after they've already hit.",
    accentColor: "#dc2626",
    dotColor: "#dc2626",
    out: "og-quiz-reactive.jpg",
  },
  {
    tier: "Proactive",
    badge: "Proactive Tier",
    badgeBg: "rgba(217, 119, 6, 0.12)",
    badgeColor: "#92400E",
    title: "RabbitMQ Skills Assessment",
    subtitle: "Solid fundamentals. The gaps are in depth, not basics.",
    accentColor: "#d97706",
    dotColor: "#d97706",
    out: "og-quiz-proactive.jpg",
  },
  {
    tier: "Production-Grade",
    badge: "Production-Grade Tier",
    badgeBg: "rgba(5, 150, 105, 0.12)",
    badgeColor: "#065F46",
    title: "RabbitMQ Skills Assessment",
    subtitle: "You know your brokers. Now make sure your team does too.",
    accentColor: "#059669",
    dotColor: "#059669",
    out: "og-quiz-production-grade.jpg",
  },
];

function buildHtml({ tier, badge, badgeBg, badgeColor, title, subtitle, accentColor, dotColor }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: "Bricolage Grotesque";
    font-style: normal;
    font-display: block;
    font-weight: 200 800;
    src: url("${FONT_URL}") format("woff2");
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 1200px;
    height: 630px;
    background: #FEF8F4;
    font-family: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;
    display: flex;
    align-items: stretch;
    overflow: hidden;
  }

  .sidebar {
    width: 12px;
    background: ${accentColor};
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

  .logo-img {
    height: 48px;
    width: auto;
  }

  .brand-name {
    font-size: 24px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: -0.5px;
  }

  .badge {
    margin-left: auto;
    background: ${badgeBg};
    color: ${badgeColor};
    font-size: 15px;
    font-weight: 600;
    padding: 6px 16px;
    border-radius: 100px;
    letter-spacing: 0.1px;
  }

  .middle {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .label {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: ${accentColor};
    margin-bottom: 18px;
  }

  h1 {
    font-size: 54px;
    font-weight: 800;
    color: #1a1a1a;
    line-height: 1.08;
    letter-spacing: -1.5px;
    margin-bottom: 22px;
    max-width: 920px;
  }

  .subtitle {
    font-size: 22px;
    color: #6b6b6b;
    font-weight: 400;
    line-height: 1.5;
    letter-spacing: -0.2px;
    max-width: 860px;
  }

  .bottom {
    display: flex;
    align-items: center;
    gap: 28px;
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
    background: ${dotColor};
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
      <img src="${logoDataUrl}" class="logo-img" alt="Qarote" />
      <span class="brand-name">Qarote</span>
      <span class="badge">${badge}</span>
    </div>

    <div class="middle">
      ${tier ? `<p class="label">Quiz Result</p>` : `<p class="label">Free · 20 Questions · ~5 min</p>`}
      <h1>${title}</h1>
      <p class="subtitle">${subtitle}</p>
    </div>

    <div class="bottom">
      <div class="pill">
        <div class="dot"></div>
        RabbitMQ Interview Prep
      </div>
      <div class="divider"></div>
      <div class="pill">Beginner → Advanced</div>
      <div class="divider"></div>
      <div class="pill">Free</div>
      <span class="url">qarote.io/quiz</span>
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
  const buf = await page.screenshot({
    type: "jpeg",
    quality: 92,
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });
  const outPath = resolve(OUT_DIR, card.out);
  writeFileSync(outPath, buf);
  console.log(`✓ ${card.out}`);
  await page.close();
}

await browser.close();
console.log("Done.");
