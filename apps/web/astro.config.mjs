import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
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
      // Exclude docs — managed separately via dedicated doc tooling.
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
    // Forward VITE_* env vars to client-side code.
    // Astro only exposes PUBLIC_* by default; this ensures backward
    // compatibility with components shared across the monorepo.
    envPrefix: ["VITE_", "PUBLIC_"],
  },
});
