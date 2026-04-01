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
const LOCALES = ["fr", "es", "zh"];
const BASE_ROUTES = ["/", "/privacy-policy", "/terms-of-service", "/changelog"];
const ROUTES = [
  // English routes (root)
  ...BASE_ROUTES,
  // Localized routes
  ...LOCALES.flatMap((locale) =>
    BASE_ROUTES.map((route) =>
      route === "/" ? `/${locale}` : `/${locale}${route}`
    )
  ),
  // 404 page (use nested path so it falls through /:locale to the * catch-all)
  "/not-a-real-page/trigger-404",
];
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

      // Wait for i18n translations to load
      if (route === "/not-a-real-page/trigger-404") {
        // 404 page: wait for the NotFound component to render
        await page.waitForFunction(
          () => {
            const h1 = document.querySelector("h1");
            return h1 && h1.textContent === "404";
          },
          { timeout: 10000 }
        );
      } else {
        // Regular pages: h1 text should not be a translation key
        await page.waitForFunction(
          () => {
            const h1 = document.querySelector("h1");
            if (!h1) return false;
            const text = h1.textContent || "";
            // i18n keys look like "namespace.key" or "key.subkey"
            const looksLikeI18nKey = /^[a-z]+\.[a-z]+/i.test(text.trim());
            return text.length > 2 && !looksLikeI18nKey;
          },
          { timeout: 10000 }
        );
      }

      // Deduplicate head elements: Helmet injects tags with data-rh attr,
      // remove the original static duplicates from index.html
      await page.evaluate(() => {
        const head = document.head;

        // Deduplicate <title> — keep only the last one (Helmet's)
        const titles = head.querySelectorAll("title");
        if (titles.length > 1) {
          for (let i = 0; i < titles.length - 1; i++) titles[i].remove();
        }

        // Deduplicate meta tags by name or property
        const seen = new Map<string, Element>();
        for (const meta of Array.from(head.querySelectorAll("meta"))) {
          const key =
            meta.getAttribute("name") ||
            meta.getAttribute("property") ||
            meta.getAttribute("http-equiv");
          if (!key) continue;
          if (seen.has(key)) {
            seen.get(key)!.remove(); // remove the earlier (static) one
          }
          seen.set(key, meta);
        }

        // Deduplicate link[rel="canonical"] — keep only the last one
        const canonicals = head.querySelectorAll('link[rel="canonical"]');
        if (canonicals.length > 1) {
          for (let i = 0; i < canonicals.length - 1; i++)
            canonicals[i].remove();
        }

        // Deduplicate hreflang link tags — keep only the last set (Helmet's)
        const hreflangSeen = new Map<string, Element>();
        for (const link of Array.from(
          head.querySelectorAll('link[rel="alternate"][hreflang]')
        )) {
          const lang = link.getAttribute("hreflang") || "";
          if (hreflangSeen.has(lang)) {
            hreflangSeen.get(lang)!.remove();
          }
          hreflangSeen.set(lang, link);
        }

        // Deduplicate Tawk.to scripts
        const tawkScripts = Array.from(
          head.querySelectorAll('script[src*="tawk.to"]')
        );
        if (tawkScripts.length > 1) {
          for (let i = 1; i < tawkScripts.length; i++) tawkScripts[i].remove();
        }
        const bodyTawk = Array.from(
          document.body.querySelectorAll('script[src*="tawk.to"]')
        );
        if (bodyTawk.length > 1) {
          for (let i = 1; i < bodyTawk.length; i++) bodyTawk[i].remove();
        }
      });

      const html = await page.content();

      // Write the prerendered HTML
      let outputPath: string;
      if (route === "/not-a-real-page/trigger-404") {
        // Cloudflare Pages auto-serves 404.html with HTTP 404 for unmatched paths
        outputPath = join(DIST_DIR, "404.html");
      } else if (route === "/") {
        outputPath = join(DIST_DIR, "index.html");
      } else {
        outputPath = join(DIST_DIR, route, "index.html");
      }

      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, html);
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
