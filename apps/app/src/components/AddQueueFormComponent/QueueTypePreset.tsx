import { useTranslation } from "react-i18next";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { QUEUE_PRESETS, type QueuePresetId } from "./constants";

interface QueueTypePresetProps {
  value: QueuePresetId;
  onChange: (id: QueuePresetId) => void;
}

export const QueueTypePreset = ({ value, onChange }: QueueTypePresetProps) => {
  const { t } = useTranslation("queues");

  return (
    <fieldset
      className="space-y-3"
      role="radiogroup"
      aria-label={t("queueTypeTitle")}
    >
      <legend className="text-sm font-medium text-foreground">
        {t("queueTypeTitle")}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {QUEUE_PRESETS.map((preset) => {
          const selected = preset.id === value;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(preset.id)}
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
                <span className="block text-sm font-medium text-foreground">
                  {t(preset.titleKey)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t(preset.descKey)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
};
