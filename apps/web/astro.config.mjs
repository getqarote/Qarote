import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://qarote.io",
  output: "static",
  server: { port: 8082 },
  integrations: [
    react(),
    mdx({
      shikiConfig: { theme: "min-light" },
    }),
    sitemap({
      // Exclude docs (managed separately). The retired feature/compare pages
      // are 301 redirects now (see `redirects` above); Astro keeps generated
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
