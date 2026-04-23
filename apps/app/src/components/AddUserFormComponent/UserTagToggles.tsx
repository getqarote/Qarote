import { useTranslation } from "react-i18next";

import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggleGroup";

import type { UserTag } from "@/schemas";

import { USER_TAG_DESCRIPTORS } from "./constants";

interface UserTagTogglesProps {
  value: UserTag[];
  onChange: (next: UserTag[]) => void;
}

/**
 * Tag severity → toggled-state styling. Administrator is tinted
 * with the danger palette so its selected state reads as elevated
 * privilege; policymaker / impersonator use warning; the rest are
 * neutral secondary chips.
 */
const severityClasses: Record<
  (typeof USER_TAG_DESCRIPTORS)[number]["severity"],
  string
> = {
  danger:
    "data-[state=on]:bg-destructive/10 data-[state=on]:border-destructive/60 data-[state=on]:text-destructive data-[state=on]:font-semibold",
  warning:
    "data-[state=on]:bg-warning-muted data-[state=on]:border-warning/50 data-[state=on]:text-warning data-[state=on]:font-semibold",
  neutral:
    "data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground",
};

export function UserTagToggles({ value, onChange }: UserTagTogglesProps) {
  const { t } = useTranslation("users");
  const hasAdmin = value.includes("administrator");

  return (
    <div className="space-y-2">
      <ToggleGroup
        type="multiple"
        value={value}
        onValueChange={(next: string[]) => onChange(next as UserTag[])}
        className="flex flex-wrap justify-start gap-1.5"
        aria-label={t("tagLabel")}
      >
        {USER_TAG_DESCRIPTORS.map((descriptor) => (
          <ToggleGroupItem
            key={descriptor.id}
            value={descriptor.id}
            className={cn(
              "h-7 px-2.5 text-xs border border-border",
              severityClasses[descriptor.severity]
            )}
            title={t(descriptor.descKey)}
          >
            {t(descriptor.titleKey)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {hasAdmin ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
          <span>{t("administratorWarning")}</span>
        </div>
      ) : null}
    </div>
  );
}
