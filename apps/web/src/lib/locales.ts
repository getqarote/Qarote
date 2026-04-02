import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@qarote/i18n";

/**
 * Non-default locales for Astro's getStaticPaths().
 * Excludes the default locale since Astro serves it at the root (no prefix).
 */
const NON_DEFAULT_LOCALES = SUPPORTED_LOCALES.filter(
  (l) => l !== DEFAULT_LOCALE
);

/**
 * Generate static paths for locale pages.
 * Use in getStaticPaths() for [locale]/*.astro pages.
 */
export function getLocaleStaticPaths() {
  return NON_DEFAULT_LOCALES.map((locale) => ({
    params: { locale },
  }));
}
