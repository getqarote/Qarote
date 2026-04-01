import { useTranslation } from "react-i18next";

import {
  LOCALE_FLAGS,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@qarote/i18n";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLocale = (i18n.language || "en") as SupportedLocale;

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <Globe
        className="h-3.5 w-3.5 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />
      <select
        value={currentLocale}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="appearance-none bg-transparent text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer pr-4 focus:outline-none"
        aria-label="Select language"
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_FLAGS[locale]} {LOCALE_LABELS[locale]}
          </option>
        ))}
      </select>
      <svg
        className="h-3 w-3 text-muted-foreground pointer-events-none absolute right-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
