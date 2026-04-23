import { useTranslation } from "react-i18next";

import { PixelReceipt } from "@/components/ui/pixel-receipt";

/**
 * Header for the billing detail view (`/settings/subscription/
 * billing`). Matches the primary-tinted badge pattern used by
 * SSOHeader and OrgContextHeader so the operator sees a
 * consistent header treatment across every settings surface.
 *
 * No back button: the settings sidebar (with "Subscription"
 * highlighted) is the back affordance — a separate back button
 * would be a second, weaker navigation channel.
 */
export const BillingHeader = () => {
  const { t } = useTranslation("billing");

  return (
    <div className="flex items-center gap-3 pb-2">
      <div
        className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0"
        aria-hidden="true"
      >
        <PixelReceipt className="h-5 w-auto shrink-0 text-primary" />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-tight">
          {t("header.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("header.subtitle")}</p>
      </div>
    </div>
  );
};
