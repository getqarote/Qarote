import fs from "node:fs";
import path from "node:path";

/**
 * Load translations at build time for Astro pages.
 * Reads JSON files from public/locales/{locale}/{namespace}.json
 */
export function loadTranslations(
  locale: string,
  namespace: string
): Record<string, unknown> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "locales",
    locale,
    `${namespace}.json`
  );
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/**
 * Type-safe translation accessor with dot-notation support.
 * e.g. t("seo.title") reads from { seo: { title: "..." } }
 */
export function t(translations: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let current: unknown = translations;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key; // fallback: return the key itself
    }
  }
  return typeof current === "string" ? current : key;
}
