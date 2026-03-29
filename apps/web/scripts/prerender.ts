/* eslint-disable no-console */
/**
 * Post-build prerendering script.
 *
 * Spins up a local static server from dist/, visits each route with Playwright,
 * waits for React to hydrate and i18n to load, then writes the fully rendered
 * HTML back to dist/. The result is that crawlers (including AI bots that don't
 * execute JS) see real page content instead of an empty <div id="root"></div>.
 *
 * Usage: npx tsx scripts/prerender.ts
 * Requires: playwright (dev dependency)
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";

import { chromium } from "playwright";

const DIST_DIR = join(import.meta.dirname, "..", "dist");
const ROUTES = ["/", "/privacy-policy", "/terms-of-service", "/changelog"];
const PORT = 4173;

function serveStatic(
  dir: string,
  port: number
): Promise<ReturnType<typeof createServer>> {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = req.url || "/";
      const filePath =
        url === "/" || !url.includes(".")
          ? join(dir, "index.html")
          : join(dir, url);
      try {
        const content = readFileSync(filePath);
        const ext = filePath.split(".").pop() || "";
        const mimeTypes: Record<string, string> = {
          html: "text/html",
          js: "application/javascript",
          css: "text/css",
          json: "application/json",
          png: "image/png",
          svg: "image/svg+xml",
          webp: "image/webp",
          txt: "text/plain",
        };
        res.writeHead(200, {
          "Content-Type": mimeTypes[ext] || "application/octet-stream",
        });
        res.end(content);
      } catch {
        // SPA fallback
        const fallback = readFileSync(join(dir, "index.html"));
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(fallback);
      }
    });
    server.listen(port, () => resolve(server));
  });
}

async function prerender() {
  console.log("Starting prerender for routes:", ROUTES.join(", "));

  const server = await serveStatic(DIST_DIR, PORT);
  const browser = await chromium.launch();

  try {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      const url = `http://localhost:${PORT}${route}`;

      console.log(`  Rendering ${route}...`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

      // Wait for React to render content (the root div should have children)
      await page.waitForFunction(
        () => {
          const root = document.getElementById("root");
          return root && root.children.length > 0;
        },
        { timeout: 15000 }
      );

      // Small extra wait for i18n translations to load
      await page.waitForTimeout(500);

      const html = await page.content();

      // Write the prerendered HTML
      const outputPath =
        route === "/"
          ? join(DIST_DIR, "index.html")
          : join(DIST_DIR, route, "index.html");

      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, `<!doctype html>\n${html}`);
      console.log(`  Wrote ${outputPath}`);

      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log("Prerender complete!");
}

prerender().catch((err) => {
  console.error("Prerender failed:", err);
  process.exit(1);
});
