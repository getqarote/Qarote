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

  // Static route map — values are hardcoded literals, never derived from DOM.
  // Each regex matches a pathname pattern; the corresponding path is used
  // to build the navigation URL. This ensures no DOM-sourced taint flows
  // into window.location.href (satisfies CodeQL js/xss-through-dom).
  const ROUTE_PATTERNS: [RegExp, string][] = [
    [/^(?:\/(fr|es|zh))?\/features\/?$/, "/features/"],
    [/^(?:\/(fr|es|zh))?\/privacy-policy\/?$/, "/privacy-policy/"],
    [/^(?:\/(fr|es|zh))?\/terms-of-service\/?$/, "/terms-of-service/"],
    [/^(?:\/(fr|es|zh))?\/changelog\/?$/, "/changelog/"],
    [/^(?:\/(fr|es|zh))?\/about\/?$/, "/about/"],
  ];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;

    // Validate the selected locale against the allow-list
    if (!SUPPORTED_LOCALES.includes(selectedValue as SupportedLocale)) return;
    const newLocale = selectedValue as SupportedLocale;

    // Match current pathname against known routes to get a safe base path.
    // The basePath is always a hardcoded string literal from ROUTE_PATTERNS.
    const pathname = window.location.pathname;
    let basePath = "/";
    for (const [pattern, path] of ROUTE_PATTERNS) {
      if (pattern.test(pathname)) {
        basePath = path;
        break;
      }
    }

    // Build URL entirely from validated constants
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
