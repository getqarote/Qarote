import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { AlertCircle, Lock } from "lucide-react";

import { isCloudMode } from "@/lib/featureFlags";

import { Button } from "@/components/ui/button";

/**
 * Gate shown when the caller's plan doesn't include SSO (community /
 * developer tier). Routes are different between cloud and self-hosted
 * deployments:
 *
 *   - **Cloud**: single "View plans" CTA → pricing page
 *   - **Self-hosted**: "Activate license" (primary, to the license
 *     settings page) + "Purchase license" (secondary, opens the
 *     portal in a new tab)
 *
 * The primary action uses the default `<Button>` variant — no manual
 * `bg-primary` override needed.
 */
export function SSOUpgradePrompt() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cloud = isCloudMode();

  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-full max-w-md rounded-lg border-2 border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <h2 className="title-section flex items-center gap-2">
            <Lock
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            {t("settings:sso.upgradeTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("settings:sso.upgradeDescription")}
          </p>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            <AlertCircle
              className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {t("settings:sso.upgradeRequirement")}
              </p>
              <p className="text-sm text-muted-foreground">
                {cloud
                  ? t("settings:sso.upgradeCloudHint")
                  : t("settings:sso.upgradeSelfHostedHint")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {cloud ? (
              <Button className="flex-1" onClick={() => navigate("/plans")}>
                {t("settings:sso.viewPlans")}
              </Button>
            ) : (
              <>
                <Button
                  className="flex-1"
                  onClick={() => navigate("/settings/license")}
                >
                  {t("settings:sso.activateLicense")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `${import.meta.env.VITE_PORTAL_URL}/purchase`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  {t("settings:sso.purchaseLicense")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
