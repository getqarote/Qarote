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
        onClick={() => navigate("/settings/subscription")}
        className="p-2 hover:bg-muted rounded-lg transition-colors"
        title={t("plans.backToPlans")}
        aria-label={t("plans.backToPlans")}
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className="p-2.5 rounded-xl bg-primary/10">
        <Receipt className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing & Usage</h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and view usage details across all your
          workspaces
        </p>
      </div>
    </div>
  );
};
