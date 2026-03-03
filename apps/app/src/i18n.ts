import { createI18nInstance } from "@qarote/i18n/react";

const i18n = createI18nInstance({
  namespaces: [
    "common",
    "auth",
    "validation",
    "sidebar",
    "dashboard",
    "queues",
    "connections",
    "nodes",
    "exchanges",
    "vhosts",
    "users",
    "alerts",
    "billing",
    "profile",
    "workspace",
    "help",
    "sso",
    "smtp",
  ],
  defaultNamespace: "common",
  loadPath: "/locales/{{lng}}/{{ns}}.json",
});

export default i18n;
