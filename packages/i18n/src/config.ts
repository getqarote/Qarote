export const SUPPORTED_LOCALES = ["en", "fr", "es", "zh"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";
export const FALLBACK_LOCALE: SupportedLocale = "en";

export const RTL_LOCALES: SupportedLocale[] = [];

export const isRTL = (locale: string): boolean =>
  RTL_LOCALES.includes(locale as SupportedLocale);

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  zh: "中文",
};

export const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  en: "🇬🇧",
  fr: "🇫🇷",
  es: "🇪🇸",
  zh: "🇨🇳",
};

export const LOCALE_STORAGE_KEY = "qarote_locale";
