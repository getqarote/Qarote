import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import type { SeverityCheckboxGroupProps } from "./types";

const SEVERITY_LEVELS = [
  {
    key: "CRITICAL",
    color: "text-destructive",
    labelKey: "modal.severityCritical",
    descKey: "modal.severityCriticalDesc",
  },
  {
    key: "HIGH",
    color: "text-orange-500",
    labelKey: "modal.severityHigh",
    descKey: "modal.severityHighDesc",
  },
  {
    key: "MEDIUM",
    color: "text-yellow-600 dark:text-yellow-500",
    labelKey: "modal.severityMedium",
    descKey: "modal.severityMediumDesc",
  },
  {
    key: "LOW",
    color: "text-blue-500",
    labelKey: "modal.severityLow",
    descKey: "modal.severityLowDesc",
  },
  {
    key: "INFO",
    color: "text-muted-foreground",
    labelKey: "modal.severityInfo",
    descKey: "modal.severityInfoDesc",
  },
] as const;

export function SeverityCheckboxGroup({
  severities,
  onChange,
  disabled = false,
  idPrefix,
}: SeverityCheckboxGroupProps) {
  const { t } = useTranslation("alerts");

  return (
    <div className="space-y-3">
      {SEVERITY_LEVELS.map(({ key, color, labelKey, descKey }) => (
        <div key={key} className="flex items-center space-x-2">
          <Checkbox
            id={`${idPrefix}-${key.toLowerCase()}`}
            checked={severities.includes(key)}
            onCheckedChange={(checked) => {
              const newSeverities = checked
                ? [...severities, key]
                : severities.filter((s) => s !== key);
              onChange(newSeverities);
            }}
            disabled={disabled}
          />
          <Label
            htmlFor={`${idPrefix}-${key.toLowerCase()}`}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className={`${color} font-medium`}>{t(labelKey)}</span>
            <span className="text-xs text-muted-foreground">{t(descKey)}</span>
          </Label>
        </div>
      ))}
    </div>
  );
}
