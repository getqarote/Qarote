import { createI18nInstance } from "@qarote/i18n/react";

const i18n = createI18nInstance({
  namespaces: ["common", "landing", "pricing", "faq", "nav", "legal"],
  defaultNamespace: "common",
  loadPath: "/locales/{{lng}}/{{ns}}.json",
});

export default i18n;
