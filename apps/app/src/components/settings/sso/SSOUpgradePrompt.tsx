import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { ArrowRight, Lock } from "lucide-react";

import { isCloudMode } from "@/lib/featureFlags";
import { openPortalPath } from "@/lib/runtimeConfig";

import { SettingsUpgradePrompt } from "@/components/settings/SettingsUpgradePrompt";
import { Button } from "@/components/ui/button";

/**
 * Gate shown when the caller's plan doesn't include SSO (community /
 * developer tier). Renders the shared {@link SettingsUpgradePrompt}; only
 * the CTA differs by deployment so the operator lands somewhere actionable:
 *
 *   - **Cloud**: single "Upgrade" CTA → pricing page
 *   - **Self-hosted**: "Activate license" (primary, to the license
 *     settings page) + "Purchase license" (secondary, opens the
 *     portal in a new tab)
 */
export function SSOUpgradePrompt() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cloud = isCloudMode();

  return (
    <SettingsUpgradePrompt
      icon={<Lock className="h-6 w-6" />}
      title={t("settings:sso.upgradeTitle")}
      body={t("settings:sso.upgradeDescription")}
      note={t("settings:sso.upgradeContactSales")}
    >
      {cloud ? (
        <Button onClick={() => navigate("/plans")}>
          {t("settings:sso.upgradeCta")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : (
        <>
          <Button onClick={() => navigate("/settings/license")}>
            {t("settings:sso.activateLicense")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="outline" onClick={() => openPortalPath("/purchase")}>
            {t("settings:sso.purchaseLicense")}
          </Button>
        </>
      )}
    </SettingsUpgradePrompt>
  );
}
