import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";

import type { BillingInterval } from "./planHelpers";

interface PlanBillingToggleProps {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
}

/**
 * Monthly/yearly toggle shown above the plans grid. Uses `role="switch"`
 * + `aria-checked` so screen readers announce it as a toggle rather
 * than generic button. The yearly position also shows a "Save 20%"
 * badge as a soft incentive.
 *
 * The thumb uses `bg-card` (not `bg-white`) so it adapts to both
 * light and dark themes — the original used `bg-white` which was
 * flagged by the audit as a dark-mode regression.
 */
export function PlanBillingToggle({ value, onChange }: PlanBillingToggleProps) {
  const { t } = useTranslation("billing");

  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <span
        className={`text-sm font-medium ${value === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
      >
        {t("plans.billingToggle.monthly")}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value === "yearly"}
        aria-label={t("plans.billingToggle.label")}
        onClick={() => onChange(value === "monthly" ? "yearly" : "monthly")}
        className={`relative inline-flex items-center w-[27px] h-[15px] rounded-full transition-colors ${
          value === "yearly" ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block w-[9px] h-[9px] rounded-full bg-card transition-transform ${
            value === "yearly" ? "translate-x-[15px]" : "translate-x-[3px]"
          }`}
        />
      </button>
      <span
        className={`text-sm font-medium ${value === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
      >
        {t("plans.billingToggle.yearly")}
      </span>
      {value === "yearly" && (
        <Badge className="bg-success-muted text-success text-xs">
          {t("plans.save20")}
        </Badge>
      )}
    </div>
  );
}
