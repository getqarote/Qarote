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

  // Known base paths for language switching (prevents DOM-sourced XSS)
  const VALID_PATHS = [
    "/",
    "/privacy-policy/",
    "/terms-of-service/",
    "/changelog/",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;

    // Validate the selected locale against the allow-list
    if (!SUPPORTED_LOCALES.includes(selectedValue as SupportedLocale)) return;
    const newLocale = selectedValue as SupportedLocale;

    // Determine current base path by matching against known routes.
    // Uses the allowlisted literal (not the DOM value) to build the URL,
    // fully cutting the DOM→href taint chain for CodeQL.
    const rawPath = window.location.pathname;
    const stripped = rawPath.replace(/^\/(fr|es|zh)(\/|$)/, "/");
    const basePath = VALID_PATHS.find((p) => p === stripped) ?? "/";

    // Build new URL entirely from validated constants
    window.location.href =
      newLocale === "en" ? basePath : `/${newLocale}${basePath}`;
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
