import {
  LOCALE_FLAGS,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@qarote/i18n";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  currentLocale?: SupportedLocale;
}

export function LanguageSwitcher({
  currentLocale = "en",
}: LanguageSwitcherProps) {
  const locale = currentLocale;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    const currentPath = window.location.pathname;

    // Strip current locale prefix to get the base path
    let basePath = currentPath;
    for (const l of SUPPORTED_LOCALES) {
      if (l !== "en" && currentPath.startsWith(`/${l}/`)) {
        basePath = currentPath.slice(`/${l}`.length);
        break;
      }
      if (l !== "en" && currentPath === `/${l}`) {
        basePath = "/";
        break;
      }
    }

    // Build new URL
    const newPath = newLocale === "en" ? basePath : `/${newLocale}${basePath}`;
    window.location.href = newPath;
  };

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <Globe
        className="h-3.5 w-3.5 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />
      <select
        value={locale}
        onChange={handleChange}
        className="appearance-none bg-transparent text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer pr-4 focus:outline-none"
        aria-label="Select language"
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_FLAGS[l]} {LOCALE_LABELS[l]}
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
