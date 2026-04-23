import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import type { BillingInterval } from "./planHelpers";

interface PlanBillingToggleProps {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
}

export function PlanBillingToggle({ value, onChange }: PlanBillingToggleProps) {
  const { t } = useTranslation("billing");

  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <Switch
        checked={value === "yearly"}
        onCheckedChange={(checked) => onChange(checked ? "yearly" : "monthly")}
        aria-label={t("plans.billingToggle.label")}
      />
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
