import { initReactI18next } from "react-i18next";

import i18n from "i18next";
import HttpBackend from "i18next-http-backend";

const I18N_NAMESPACES = [
  "common",
  "features",
  "landing",
  "pricing",
  "faq",
  "nav",
  "legal",
  "quiz",
  "security",
] as const;

/**
 * Create or return the i18next instance.
 *
 * When `resources` are provided (from Astro build-time), i18n initializes
 * synchronously so the first render shows real content instead of keys.
 * The HTTP backend is still attached for any namespaces not in `resources`.
 */
export function getI18n(
  locale = "en",
  resources?: Record<string, Record<string, unknown>>
) {
  if (i18n.isInitialized) {
    // Always overwrite resource bundles from Astro build-time props.
    // The hasResourceBundle guard caused SSR failures: the namespace was
    // registered (declared in ns) but had no data, so hasResourceBundle
    // returned true and addResourceBundle was skipped, leaving the namespace
    // empty and causing t().map crashes for array-valued keys.
    if (resources) {
      for (const [ns, bundle] of Object.entries(resources)) {
        i18n.addResourceBundle(locale, ns, bundle, true, true);
      }
    }
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
    return i18n;
  }

  const initOptions: Parameters<typeof i18n.init>[0] = {
    lng: locale,
    fallbackLng: "en",
    ns: [...I18N_NAMESPACES],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  };

  if (resources) {
    // Synchronous init with pre-loaded translations — no flash of keys
    initOptions.resources = { [locale]: resources };
    initOptions.initImmediate = false;
    // Still add HTTP backend as fallback for other locales
    i18n
      .use(HttpBackend)
      .use(initReactI18next)
      .init({
        ...initOptions,
        backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
      });
  } else {
    // Async init (fallback if no resources provided)
    i18n
      .use(HttpBackend)
      .use(initReactI18next)
      .init({
        ...initOptions,
        backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
      });
  }

  return i18n;
}
