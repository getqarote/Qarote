import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

/**
 * Pages retired by the full-agent pivot (ece144f5). That commit's config
 * comment claimed they were "301 redirects now" — the `redirects` block it
 * pointed at was never written, so they have been returning bare 404s ever
 * since, dropping the SEO equity of buying-intent queries like
 * "Qarote vs Datadog".
 *
 * Compare pages go to the landing (the pitch they used to make); feature
 * deep-dives go to the features page that replaced them. One entry per locale
 * because `prefixDefaultLocale: false` leaves en unprefixed.
 */
const RETIRED = {
  compare: ["cloudamqp", "datadog", "grafana-prometheus", "new-relic"],
  features: [
    "alerting",
    "analytics",
    "digest",
    "incident-diagnosis",
    "live-monitoring",
    "message-spy",
    "message-tracing",
    "metrics",
    "multi-server",
    "queue-management",
  ],
};

const retiredRedirects = Object.fromEntries(
  ["", "/fr", "/es", "/zh"].flatMap((prefix) => [
    ...RETIRED.compare.map((slug) => [
      `${prefix}/compare/${slug}/`,
      `${prefix}/`,
    ]),
    ...RETIRED.features.map((slug) => [
      `${prefix}/features/${slug}/`,
      `${prefix}/features/`,
    ]),
  ])
);

/**
 * Astro's static `redirects` emit meta-refresh HTML, which search engines treat
 * far more weakly than a real 301. Cloudflare Pages reads `_redirects` from the
 * build root and serves actual 301s, so we emit that file from the same RETIRED
 * table — one source of truth — and turn the HTML generation off so the two
 * cannot disagree about a path.
 */
function cloudflareRedirects() {
  return {
    name: "qarote:cloudflare-redirects",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const { writeFileSync } = await import("node:fs");
        const { fileURLToPath } = await import("node:url");
        // Both path forms. Cloudflare Pages matches `_redirects` sources
        // exactly, and it only normalises a missing trailing slash when the
        // target exists — which is precisely what these paths no longer do. So
        // `/compare/datadog` would sail past a rule written only for
        // `/compare/datadog/`. Verified against the live site: both forms 404
        // today with no Location header.
        const body = Object.entries(retiredRedirects)
          .flatMap(([from, to]) => [
            `${from} ${to} 301`,
            `${from.replace(/\/$/, "")} ${to} 301`,
          ])
          .join("\n");
        writeFileSync(`${fileURLToPath(dir)}_redirects`, `${body}\n`);
      },
    },
  };
}

export default defineConfig({
  site: "https://qarote.io",
  redirects: retiredRedirects,
  // The 301s come from `_redirects`; these would only duplicate them as HTML.
  build: { redirects: false },
  output: "static",
  server: { port: 8082 },
  integrations: [
    cloudflareRedirects(),
    react(),
    mdx({
      shikiConfig: { theme: "min-light" },
    }),
    sitemap({
      // Exclude docs (managed separately). The retired feature/compare pages
      // are 301 redirects (see `redirects` above); Astro keeps generated
      // redirect pages out of the sitemap automatically.
      filter: (page) => !page.includes("/docs/"),
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en-US",
          fr: "fr-FR",
          es: "es-ES",
          zh: "zh-CN",
        },
      },
    }),
  ],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "fr", "es", "zh"],
    routing: { prefixDefaultLocale: false },
  },
  trailingSlash: "always",
  vite: {
    // Tailwind v4 runs as a Vite plugin, not via PostCSS. Astro 7 ships Vite 8
    // (rolldown), whose postcss-import pass resolves `@import "tailwindcss"` as
    // a file path and fails before @tailwindcss/postcss ever sees it.
    plugins: [tailwindcss()],
    // Forward VITE_* env vars to client-side code.
    // Astro only exposes PUBLIC_* by default; this ensures backward
    // compatibility with components shared across the monorepo.
    envPrefix: ["VITE_", "PUBLIC_"],
    // The OG card renderer (src/pages/og/[card].png.ts) pulls in @resvg/resvg-js,
    // a native Node addon (.node), via @qarote/og-cards. Keep both external so
    // Rollup neither parses the binary nor flattens the package into a chunk
    // that Node can't resolve the native dep from at prerender time. Both are
    // direct deps of qarote-web, so they resolve from node_modules at runtime.
    ssr: { external: ["@resvg/resvg-js", "@qarote/og-cards"] },
    optimizeDeps: { exclude: ["@resvg/resvg-js", "@qarote/og-cards"] },
  },
});
