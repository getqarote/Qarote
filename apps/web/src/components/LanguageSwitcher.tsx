import { useTranslation } from "react-i18next";

import {
  LOCALE_FLAGS,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@qarote/i18n";
import { Globe } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLocale = (i18n.language || "en") as SupportedLocale;

  return (
    <Select value={currentLocale} onValueChange={(v) => i18n.changeLanguage(v)}>
      <SelectTrigger className="h-9 w-auto gap-1.5 border-none bg-transparent px-2 text-sm shadow-none hover:text-orange-500 focus:ring-0">
        <SelectValue>
          <Globe className="h-4 w-4" />
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
  );
}
