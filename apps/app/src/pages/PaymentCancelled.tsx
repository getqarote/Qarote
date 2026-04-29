import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { usePostHog } from "@posthog/react";
import { CreditCard, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PixelChevronLeft } from "@/components/ui/pixel-chevron-left";

import { usePlanUpgrade } from "@/hooks/ui/usePlanUpgrade";
import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

/**
 * Lookup for the "next tier" upgrade path. When a payment is
 * cancelled we offer to retry the upgrade, but only if there's
 * a sensible next step from the current plan.
 */
function getNextPlan(plan: UserPlan): UserPlan | null {
  switch (plan) {
    case UserPlan.FREE:
      return UserPlan.DEVELOPER;
    case UserPlan.DEVELOPER:
      return UserPlan.ENTERPRISE;
    default:
      return null;
  }
}

/**
 * Page shown when a Stripe checkout session is cancelled. Offers
 * two actions: retry the upgrade (or fall back to the plans page
 * if no next tier is available), or return to the dashboard.
 */
const PaymentCancelled = () => {
  const { t } = useTranslation("billing");
  const posthog = usePostHog();
  const navigate = useNavigate();
  const { handleUpgrade, isUpgrading } = usePlanUpgrade();
  const { userPlan } = useUser();

  const nextPlan = getNextPlan(userPlan);

  useEffect(() => {
    posthog?.capture("payment_cancelled", { plan: userPlan });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTryAgain = () => {
    if (nextPlan) {
      handleUpgrade(nextPlan);
    } else {
      navigate("/plans");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <XCircle
              className="w-16 h-16 text-destructive mx-auto mb-4"
              aria-hidden="true"
            />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t("paymentCancelled.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("paymentCancelled.description")}
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleTryAgain}
              disabled={isUpgrading}
              className="w-full"
            >
              {isUpgrading ? (
                <>
                  <Loader2
                    className="w-4 h-4 mr-2 animate-spin"
                    aria-hidden="true"
                  />
                  {t("paymentCancelled.processing")}
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" aria-hidden="true" />
                  {t("paymentCancelled.tryAgain")}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full"
            >
              <PixelChevronLeft
                className="h-4 w-auto shrink-0 mr-2"
                aria-hidden="true"
              />
              {t("paymentCancelled.backToDashboard")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancelled;
