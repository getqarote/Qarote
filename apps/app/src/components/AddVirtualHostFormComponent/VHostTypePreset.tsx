import { useTranslation } from "react-i18next";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import type { VHostQueueType } from "@/schemas";

import { VHOST_QUEUE_TYPE_DESCRIPTORS } from "./constants";

interface VHostTypePresetProps {
  /** `undefined` means "server default" is selected. */
  value: VHostQueueType | undefined;
  onChange: (next: VHostQueueType | undefined) => void;
}

export const VHostTypePreset = ({ value, onChange }: VHostTypePresetProps) => {
  const { t } = useTranslation("vhosts");

  return (
    <fieldset
      className="space-y-3"
      role="radiogroup"
      aria-label={t("defaultQueueTypeOptional")}
    >
      <legend className="text-sm font-medium text-foreground">
        {t("defaultQueueTypeOptional")}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {VHOST_QUEUE_TYPE_DESCRIPTORS.map((desc) => {
          const isDefault = desc.id === "default";
          const selected = isDefault ? value === undefined : desc.id === value;

          return (
            <button
              key={desc.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() =>
                onChange(isDefault ? undefined : (desc.id as VHostQueueType))
              }
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
