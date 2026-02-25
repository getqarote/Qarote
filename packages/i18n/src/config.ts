export const SUPPORTED_LOCALES = [
  "en",
  "fr",
  "es",
  "zh",
  "ja",
  "ko",
  "de",
  "pt",
  "it",
  "ru",
  "ar",
  "he",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";
export const FALLBACK_LOCALE: SupportedLocale = "en";

export const RTL_LOCALES: SupportedLocale[] = ["ar", "he"];

export const isRTL = (locale: string): boolean =>
  RTL_LOCALES.includes(locale as SupportedLocale);

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
  ru: "Русский",
  ar: "العربية",
  he: "עברית",
};

export const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  en: "🇬🇧",
  fr: "🇫🇷",
  es: "🇪🇸",
  zh: "🇨🇳",
  ja: "🇯🇵",
  ko: "🇰🇷",
  de: "🇩🇪",
  pt: "🇧🇷",
  it: "🇮🇹",
  ru: "🇷🇺",
  ar: "🇸🇦",
  he: "🇮🇱",
};

export const LOCALE_STORAGE_KEY = "qarote_locale";
