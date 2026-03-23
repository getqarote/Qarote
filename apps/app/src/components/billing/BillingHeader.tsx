import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { ArrowLeft, Receipt } from "lucide-react";

export const BillingHeader = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("billing");

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => navigate("/settings/plans")}
        className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
        title={t("plans.backToPlans")}
        aria-label={t("plans.backToPlans")}
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Receipt className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Billing & Usage
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your subscription and payment details
          </p>
        </div>
      </div>
    </div>
  );
};
