import { useTranslation } from "react-i18next";

import {
  LOCALE_FLAGS,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@qarote/i18n";
import { Globe } from "lucide-react";

import { trpc } from "@/lib/trpc/client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/contexts/AuthContextDefinition";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const updateLocale = trpc.user.updateLocale.useMutation();

  const currentLocale = (i18n.language || "en") as SupportedLocale;

  const handleChange = (locale: string) => {
    i18n.changeLanguage(locale);
    // Persist to backend if authenticated
    if (isAuthenticated) {
      updateLocale.mutate({ locale });
    }
  };

  return (
    <Select value={currentLocale} onValueChange={handleChange}>
      <SelectTrigger className="w-full text-sm">
        <SelectValue>
          <div className="flex items-center gap-2">
            <Globe className="h-3 w-3 shrink-0" />
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
  );
}
