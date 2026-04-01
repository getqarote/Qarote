import { initReactI18next } from "react-i18next";

import i18n from "i18next";
import HttpBackend from "i18next-http-backend";

/**
 * Lightweight i18next instance for React islands.
 * Loads translations at runtime from /locales/{lng}/{ns}.json
 */
if (!i18n.isInitialized) {
  i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
      fallbackLng: "en",
      ns: ["common", "landing", "pricing", "faq", "nav", "legal"],
      defaultNS: "common",
      backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
      interpolation: { escapeValue: false },
      react: { useSuspense: true },
    });
}

export default i18n;
