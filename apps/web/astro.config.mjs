import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://qarote.io",
  output: "static",
  server: { port: 8082 },
  integrations: [react(), sitemap()],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "fr", "es", "zh"],
    routing: { prefixDefaultLocale: false },
  },
  trailingSlash: "always",
  vite: {
    ssr: {
      noExternal: ["@qarote/i18n"],
    },
  },
});
