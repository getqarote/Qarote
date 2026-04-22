import { createI18nInstance } from "@qarote/i18n/react";

const i18n = createI18nInstance({
  namespaces: [
    "common",
    "auth",
    "validation",
    "sidebar",
    "dashboard",
    "queues",
    "channels",
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
    "appearance",
    "settings",
    "sso",
    "smtp",
    "topology",
    "onboarding",
    "definitions",
  ],
  defaultNamespace: "common",
  loadPath: "/locales/{{lng}}/{{ns}}.json",
});

export default i18n;
