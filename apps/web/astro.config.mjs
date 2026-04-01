import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@qarote/i18n";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://qarote.io",
  output: "static",
  server: { port: 8082 },
  integrations: [react(), sitemap()],
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...SUPPORTED_LOCALES],
    routing: { prefixDefaultLocale: false },
  },
  trailingSlash: "always",
});
