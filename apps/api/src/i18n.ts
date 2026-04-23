import { createServerI18nInstance } from "@qarote/i18n/server";

import enEmails from "../locales/en/emails.json" with { type: "json" };
import enErrors from "../locales/en/errors.json" with { type: "json" };
import esEmails from "../locales/es/emails.json" with { type: "json" };
import esErrors from "../locales/es/errors.json" with { type: "json" };
import frEmails from "../locales/fr/emails.json" with { type: "json" };
import frErrors from "../locales/fr/errors.json" with { type: "json" };
import zhEmails from "../locales/zh/emails.json" with { type: "json" };
import zhErrors from "../locales/zh/errors.json" with { type: "json" };

/**
 * Server-side i18n instance for the API
 * Uses static imports so locale data is embedded in the Bun binary
 */
const i18n = createServerI18nInstance({
  en: {
    errors: enErrors,
    emails: enEmails,
  },
  fr: {
    errors: frErrors,
    emails: frEmails,
  },
  es: {
    errors: esErrors,
    emails: esEmails,
  },
  zh: {
    errors: zhErrors,
    emails: zhEmails,
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
