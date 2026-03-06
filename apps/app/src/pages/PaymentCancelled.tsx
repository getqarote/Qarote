import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { ArrowLeft, CreditCard, Loader2, XCircle } from "lucide-react";

import { usePlanUpgrade } from "@/hooks/ui/usePlanUpgrade";
import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

const PaymentCancelled: React.FC = () => {
  const { t } = useTranslation("billing");
  const navigate = useNavigate();
  const { handleUpgrade, isUpgrading } = usePlanUpgrade();
  const { userPlan } = useUser();

  // Helper function to get next plan
  const getNextPlan = (plan: UserPlan): UserPlan | null => {
    switch (plan) {
      case UserPlan.FREE:
        return UserPlan.DEVELOPER;
      case UserPlan.DEVELOPER:
        return UserPlan.ENTERPRISE;
      default:
        return null;
    }
  };

  const nextPlan = getNextPlan(userPlan);

  const handleTryAgain = () => {
    if (nextPlan) {
      handleUpgrade(nextPlan);
    } else {
      // Fallback to plans page if no next plan available
      navigate("/plans");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-page flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t("paymentCancelled.title")}
          </h1>
          <p className="text-gray-600">{t("paymentCancelled.description")}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleTryAgain}
            className="w-full bg-gradient-button hover:bg-gradient-button-hover text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
            disabled={isUpgrading}
          >
            {isUpgrading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("paymentCancelled.processing")}
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {t("paymentCancelled.tryAgain")}
              </>
            )}
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("paymentCancelled.backToDashboard")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelled;
