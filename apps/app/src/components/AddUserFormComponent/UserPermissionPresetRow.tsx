import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import {
  USER_PERMISSION_PRESETS,
  type UserPermissionPresetId,
} from "./constants";

interface UserPermissionPresetRowProps {
  activeId: UserPermissionPresetId | "custom";
  onSelect: (id: UserPermissionPresetId) => void;
}

/**
 * Three-up preset row for the 95% case: full, read-only, write-only.
 * "custom" isn't a preset — it's what the row renders as when the
 * regex fields no longer match any preset.
 */
export function UserPermissionPresetRow({
  activeId,
  onSelect,
}: UserPermissionPresetRowProps) {
  const { t } = useTranslation("users");

  return (
    <div
      role="radiogroup"
      aria-label={t("permissionPresetLabel")}
      className="grid grid-cols-3 gap-2"
    >
      {USER_PERMISSION_PRESETS.map((preset) => {
        const active = activeId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(preset.id)}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary/5"
                : "border-border bg-background hover:border-foreground/20"
            )}
          >
            <span className="text-xs font-semibold text-foreground">
              {t(preset.titleKey)}
            </span>
            <span className="text-[11px] text-muted-foreground leading-tight">
              {t(preset.descKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
