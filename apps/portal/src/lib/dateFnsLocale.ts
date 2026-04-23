import type { Locale } from "date-fns";
import { enUS, es, fr, zhCN } from "date-fns/locale";

const DATE_FNS_LOCALES: Record<string, Locale> = {
  en: enUS,
  fr,
  es,
  zh: zhCN,
};

export function getDateFnsLocale(language: string): Locale {
  return DATE_FNS_LOCALES[language] ?? enUS;
}
