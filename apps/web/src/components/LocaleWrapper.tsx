import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useParams } from "react-router";

import { SUPPORTED_LOCALES, type SupportedLocale } from "@qarote/i18n";

/**
 * Locale wrapper for URL-based locale routing.
 * Reads the :locale param from the URL and syncs it with i18next.
 * English uses no prefix (/) while other locales use /{locale}/ prefix.
 */
export function LocaleWrapper() {
  const { locale } = useParams<{ locale: string }>();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (
      locale &&
      SUPPORTED_LOCALES.includes(locale as SupportedLocale) &&
      i18n.language !== locale
    ) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  return <Outlet />;
}
