import { useTranslation } from "react-i18next";

import {
  LOCALE_FLAGS,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@qarote/i18n";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggleGroup";

import { useTheme } from "@/contexts/ThemeContext";

const THEMES = [
  { value: "light", labelKey: "light" },
  { value: "dark", labelKey: "dark" },
  { value: "system", labelKey: "system" },
] as const;

/**
 * Miniature window mockup (prototype `.themecard__prev`): a sidebar + content
 * bars. The light/dark previews intentionally use literal neutral palettes (not
 * semantic tokens) — the whole point is to depict each theme regardless of the
 * one currently active; "system" is a diagonal split of the two. The accent bar
 * stays `bg-primary` (carrot doesn't flip between themes).
 */
function ThemePreview({ variant }: { variant: "light" | "dark" | "system" }) {
  if (variant === "system") {
    return (
      <div className="h-[58px] rounded-md border border-border bg-gradient-to-br from-neutral-100 from-50% to-zinc-900 to-50%" />
    );
  }
  const dark = variant === "dark";
  return (
    <div
      className={cn(
        "flex h-[58px] overflow-hidden rounded-md border border-border",
        dark ? "bg-zinc-900" : "bg-neutral-100"
      )}
    >
      <div
        className={cn(
          "w-[34%] border-r",
          dark ? "border-white/10 bg-zinc-950" : "border-black/5 bg-neutral-200"
        )}
      />
      <div className="flex-1 space-y-[5px] p-[7px]">
        <div className="h-1.5 w-2/3 rounded-full bg-primary" />
        <div
          className={cn(
            "h-1.5 w-[85%] rounded-full",
            dark ? "bg-zinc-700" : "bg-neutral-300"
          )}
        />
        <div
          className={cn(
            "h-1.5 w-[70%] rounded-full",
            dark ? "bg-zinc-700" : "bg-neutral-300"
          )}
        />
      </div>
    </div>
  );
}

/**
 * `/settings/appearance` — device-local presentation. Theme is wired
 * (ThemeContext); language switches i18n. Density (in the prototype) is omitted
 * until a density preference exists in the app, rather than ship a control that
 * does nothing.
 */
const AppearanceSection = () => {
  const { t, i18n } = useTranslation("appearance");
  const { theme, setTheme } = useTheme();
  const currentLocale = (i18n.language || "en") as SupportedLocale;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Theme */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold">{t("themeTitle")}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("themeDescription")}
        </p>

        <ToggleGroup
          type="single"
          value={theme}
          onValueChange={(v) => {
            if (!v) return;
            setTheme(v as (typeof THEMES)[number]["value"]);
          }}
          role="radiogroup"
          aria-label={t("themeTitle")}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {THEMES.map(({ value, labelKey }) => {
            const selected = theme === value;
            return (
              <ToggleGroupItem
                key={value}
                value={value}
                role="radio"
                aria-checked={selected}
                className={cn(
                  "h-auto flex-col items-stretch gap-2.5 rounded-xl border p-3",
                  selected
                    ? "border-primary ring-1 ring-primary/40"
                    : "border-border hover:border-foreground/20"
                )}
              >
                <ThemePreview variant={value} />
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[13px] font-semibold">
                    {t(labelKey)}
                  </span>
                  {selected && (
                    <Check
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      {/* Language */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold">{t("languageTitle")}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("languageDescription")}
        </p>

        <Select
          value={currentLocale}
          onValueChange={(v) => i18n.changeLanguage(v)}
        >
          <SelectTrigger className="mt-4 w-full sm:w-72">
            <SelectValue>
              <span className="flex items-center gap-2">
                {LOCALE_FLAGS[currentLocale]} {LOCALE_LABELS[currentLocale]}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LOCALES.map((locale) => (
              <SelectItem key={locale} value={locale}>
                <span className="flex items-center gap-2">
                  <span>{LOCALE_FLAGS[locale]}</span>
                  <span>{LOCALE_LABELS[locale]}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default AppearanceSection;
