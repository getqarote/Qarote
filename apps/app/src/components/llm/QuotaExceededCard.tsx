import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AlertCircle, ArrowUpRight, KeyRound, Settings } from "lucide-react";

import { track } from "@/lib/analytics";
import { formatDate } from "@/lib/date-utils";

import { Button } from "@/components/ui/button";

import type { QuotaPayload } from "@/hooks/ui/useStreamingExplain";

interface QuotaExceededCardProps {
  quota: QuotaPayload;
  /**
   * PostHog feature tag — same value used by the surrounding stream
   * ("explain_finding" / "explain_trace") so analytics correlate.
   */
  feature: string;
  /**
   * Workspace-billing settings page. Required for the upsell CTA — without
   * it the upgrade button is hidden (self-hosted Free workspaces have no
   * billing route).
   */
  billingHref?: string;
  /**
   * LLM provider settings page. Required for the BYOK CTA — without it the
   * BYOK button is hidden (managed-disabled instances always provide this).
   */
  llmSettingsHref?: string;
}

/**
 * Body-replacement component shown inside the explain drawer when the
 * server emits an at-cap `event: quota` SSE event. Renders one of two
 * variants based on `quota.reason`:
 *
 * - `cap_reached`     — monthly cap exhausted. Surfaces remaining-until-
 *   reset, the cap number, and (depending on plan) an Upgrade CTA + a
 *   BYOK fallback CTA.
 * - `managed_disabled` — the admin has Managed LLM turned off on this
 *   instance. Single CTA points at LLM settings to configure BYOK.
 *
 * NOT a destructive `Alert` — this is an actionable policy state, not
 * a failure. Uses a neutral surface (`bg-muted/40`) so it doesn't read
 * as an error to the operator.
 */
export function QuotaExceededCard({
  quota,
  feature,
  billingHref,
  llmSettingsHref,
}: QuotaExceededCardProps) {
  const { t, i18n } = useTranslation("scan");

  const isManagedDisabled = quota.reason === "managed_disabled";
  const resetLabel = formatDate(quota.resetDate, i18n.language, {
    month: "long",
    day: "numeric",
  });

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-border bg-muted/40 px-4 py-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {isManagedDisabled ? (
            <Settings className="h-4 w-4 text-muted-foreground" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">
            {isManagedDisabled
              ? t("explain.quota.disabledTitle")
              : t("explain.quota.capTitle", {
                  cap: quota.cap,
                })}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isManagedDisabled
              ? t("explain.quota.disabledBody")
              : t("explain.quota.capBody", {
                  cap: quota.cap,
                  resetDate: resetLabel,
                })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-7">
        {isManagedDisabled ? (
          llmSettingsHref && (
            <Button
              asChild
              size="sm"
              variant="default"
              onClick={() =>
                track("llm_quota_byok_fallback_offered", { feature })
              }
            >
              <Link to={llmSettingsHref}>
                <KeyRound className="h-3.5 w-3.5" />
                {t("explain.quota.actions.configureKey")}
              </Link>
            </Button>
          )
        ) : (
          <>
            {billingHref && (
              <Button
                asChild
                size="sm"
                variant="default"
                onClick={() =>
                  track("llm_quota_upsell_clicked", {
                    feature,
                    used: quota.used,
                    cap: quota.cap,
                  })
                }
              >
                <Link to={billingHref}>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {t("explain.quota.actions.upgrade")}
                </Link>
              </Button>
            )}
            {llmSettingsHref && (
              <Button
                asChild
                size="sm"
                variant="outline"
                onClick={() =>
                  track("llm_quota_byok_fallback_offered", { feature })
                }
              >
                <Link to={llmSettingsHref}>
                  <KeyRound className="h-3.5 w-3.5" />
                  {t("explain.quota.actions.byok")}
                </Link>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
