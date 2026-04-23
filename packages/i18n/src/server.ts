import i18n, { type i18n as I18nInstance } from "i18next";

import { FALLBACK_LOCALE, SUPPORTED_LOCALES } from "./config.js";

export function createServerI18nInstance(
  resources: Record<string, Record<string, object>>
): I18nInstance {
  const instance = i18n.createInstance();

  instance.init({
    showSupportNotice: false,
    supportedLngs: [...SUPPORTED_LOCALES],
    fallbackLng: FALLBACK_LOCALE,
    defaultNS: "errors",
    resources,
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
}

export function getFixedT(instance: I18nInstance, locale: string) {
  return instance.getFixedT(locale);
}
