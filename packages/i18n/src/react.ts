import i18n, { type i18n as I18nInstance } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

import {
  FALLBACK_LOCALE,
  isRTL,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from "./config";

export interface CreateI18nOptions {
  /** Namespace names to load (e.g. ['common', 'dashboard']) */
  namespaces: string[];
  /** Default namespace for t() calls without prefix */
  defaultNamespace: string;
  /** URL path template for loading JSON files. Use {{lng}} and {{ns}} placeholders. */
  loadPath: string;
}

export function createI18nInstance(options: CreateI18nOptions): I18nInstance {
  const instance = i18n.createInstance();

  instance
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      supportedLngs: [...SUPPORTED_LOCALES],
      fallbackLng: FALLBACK_LOCALE,
      defaultNS: options.defaultNamespace,
      ns: options.namespaces,
      backend: {
        loadPath: options.loadPath,
      },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: LOCALE_STORAGE_KEY,
        caches: ["localStorage"],
      },
      interpolation: {
        escapeValue: false, // React already escapes
      },
      react: {
        useSuspense: true,
      },
    });

  // Update dir and lang on html element when language changes
  instance.on("languageChanged", (lng) => {
    document.documentElement.lang = lng;
    document.documentElement.dir = isRTL(lng) ? "rtl" : "ltr";
  });

  return instance;
}

export { initReactI18next };
