import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createServerI18nInstance } from "@qarote/i18n/server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "..", "locales");

function loadJSON(locale: string, ns: string): object {
  return JSON.parse(
    fs.readFileSync(path.join(localesDir, locale, `${ns}.json`), "utf-8")
  );
}

/**
 * Server-side i18n instance for the API
 * Loads all locale resources at startup (no lazy loading needed server-side)
 */
const i18n = createServerI18nInstance({
  en: {
    errors: loadJSON("en", "errors"),
    emails: loadJSON("en", "emails"),
  },
  fr: {
    errors: loadJSON("fr", "errors"),
    emails: loadJSON("fr", "emails"),
  },
  es: {
    errors: loadJSON("es", "errors"),
    emails: loadJSON("es", "emails"),
  },
  zh: {
    errors: loadJSON("zh", "errors"),
    emails: loadJSON("zh", "emails"),
  },
});

/**
 * Get a translated error message
 * Convenience wrapper for the most common use case
 */
export function te(locale: string, key: string, options?: object): string {
  return i18n.t(key, { lng: locale, ns: "errors", ...options });
}

/**
 * Get a translated email string
 */
export function tEmail(locale: string, key: string, options?: object): string {
  return i18n.t(key, { lng: locale, ns: "emails", ...options });
}
