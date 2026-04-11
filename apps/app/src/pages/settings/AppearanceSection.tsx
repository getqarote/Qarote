import { useTranslation } from "react-i18next";

import {
  LOCALE_FLAGS,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@qarote/i18n";
import { Globe, Monitor, Moon, Sun } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggleGroup";

import { useTheme } from "@/contexts/ThemeContext";

const themes = [
  { value: "light" as const, icon: Sun, labelKey: "light" },
  { value: "dark" as const, icon: Moon, labelKey: "dark" },
  { value: "system" as const, icon: Monitor, labelKey: "system" },
];

const AppearanceSection = () => {
  const { t, i18n } = useTranslation("appearance");
  const { theme, setTheme } = useTheme();
  const currentLocale = (i18n.language || "en") as SupportedLocale;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <h2 className="title-section">{t("themeTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("themeDescription")}{" "}
            <span className="text-muted-foreground">
              {t("themeSystemHint")}
            </span>
          </p>
        </div>
        <div className="p-4">
          <ToggleGroup
            type="single"
            value={theme}
            onValueChange={(v) => {
              if (!v) return;
              setTheme(v as typeof theme);
            }}
            role="radiogroup"
            aria-label={t("themeTitle")}
            className="grid grid-cols-1 sm:grid-cols-3 gap-2"
          >
            {themes.map(({ value, icon: Icon, labelKey }) => {
              const selected = theme === value;
              return (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  role="radio"
                  aria-checked={selected}
                  className={`h-auto flex flex-col items-center justify-center gap-2 rounded-lg border px-4 py-3 data-[state=on]:border-primary/60 data-[state=on]:bg-primary/5 ${
                    selected
                      ? "text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${selected ? "text-primary" : ""}`}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">{t(labelKey)}</span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <h2 className="title-section">{t("languageTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("languageDescription")}
          </p>
        </div>
        <div className="p-4">
          <Select
            value={currentLocale}
            onValueChange={(v) => i18n.changeLanguage(v)}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {LOCALE_FLAGS[currentLocale]} {LOCALE_LABELS[currentLocale]}
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LOCALES.map((locale) => (
                <SelectItem key={locale} value={locale}>
                  <div className="flex items-center gap-2">
                    <span>{LOCALE_FLAGS[locale]}</span>
                    <span>{LOCALE_LABELS[locale]}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSection;
