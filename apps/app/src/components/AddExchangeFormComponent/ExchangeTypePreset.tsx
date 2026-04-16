import { useTranslation } from "react-i18next";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ExchangeType } from "@/schemas";

import { EXCHANGE_TYPE_DESCRIPTORS } from "./constants";

interface ExchangeTypePresetProps {
  value: ExchangeType | "";
  onChange: (id: ExchangeType) => void;
}

export const ExchangeTypePreset = ({
  value,
  onChange,
}: ExchangeTypePresetProps) => {
  const { t } = useTranslation("exchanges");

  return (
    <fieldset
      className="space-y-3"
      role="radiogroup"
      aria-label={t("exchangeTypeTitle")}
    >
      <legend className="text-sm font-medium text-foreground">
        {t("exchangeTypeTitle")}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {EXCHANGE_TYPE_DESCRIPTORS.map((desc) => {
          const selected = desc.id === value;
          return (
            <button
              key={desc.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(desc.id)}
              className={cn(
                "group relative flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40"
                )}
                aria-hidden
              >
                {selected && <Check className="h-3 w-3" />}
              </span>
              <span className="flex-1 space-y-0.5">
                <span className="flex items-center gap-2">
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", desc.dotClass)}
                    aria-hidden
                  />
                  <span className="block text-sm font-medium text-foreground">
                    {t(desc.titleKey)}
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t(desc.descKey)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
};
