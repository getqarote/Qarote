/**
 * Cockpit "no alert channel yet" nudge.
 *
 * Detection runs server-side on every workspace regardless of UI state — but a
 * critical finding only *reaches a human* if at least one notification channel
 * (email / Slack / webhook) is configured. With zero channels, an incident
 * fires silently. This insert surfaces that missing config and routes to the
 * existing Alerts "Notification settings" panel.
 *
 * It is a completion-pattern insert (same shape as "Connect your agent"): it
 * shows only while the gap exists and disappears the moment any channel is
 * active. It is NOT permanent cockpit furniture, NOT a global detection
 * on/off toggle (detection is rule-driven and always on), and NOT a duplicate
 * of Notification settings — just a contextual shortcut into it.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Bell, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  useAlertNotificationSettings,
  useSlackConfigs,
  useWebhooks,
} from "@/hooks/queries/useAlerts";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

// Persisted so a dismiss survives reloads (the nudge still also vanishes the
// moment a real channel is added). Wrapped in try/catch for private-mode /
// storage-disabled browsers.
const DISMISS_KEY = "qarote:cockpit:pushBannerDismissed";
const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

export function PushBanner() {
  const { t } = useTranslation("cockpit");
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(readDismissed);
  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore — dismiss still holds for this session via state
    }
  };

  // Alerting is a licensed feature; never nudge a workspace toward a panel it
  // cannot use. `isLoading` here also gates the feature-flag round-trip.
  const { hasFeature, isLoading: featureFlagsLoading } = useFeatureFlags();
  const alertingEnabled = hasFeature("alerting");

  // Channel-config sources. Each is gated on `alertingEnabled` so we don't
  // fire the queries when the panel is unreachable anyway.
  const notificationSettings = useAlertNotificationSettings(alertingEnabled);
  const slackConfigs = useSlackConfigs(alertingEnabled);
  const webhooks = useWebhooks(alertingEnabled);

  // Anti-flash: render nothing until every source has real data. The settings
  // query ships `placeholderData` (email enabled / no contact email), so we
  // must exclude the placeholder explicitly — otherwise we'd read a default
  // that misrepresents the "configured" state.
  const loading =
    featureFlagsLoading ||
    notificationSettings.isPlaceholderData ||
    notificationSettings.isLoading ||
    slackConfigs.isLoading ||
    webhooks.isLoading;

  if (!alertingEnabled || loading) return null;

  // A channel counts as "configured" only when it can actually deliver:
  //  - email: enabled AND a contact address is set
  //  - slack / webhook: at least one row that is enabled
  const settings = notificationSettings.data?.settings;
  const emailConfigured = Boolean(
    settings?.emailNotificationsEnabled && settings?.contactEmail
  );
  const slackConfigured = (slackConfigs.data ?? []).some((c) => c.enabled);
  const webhookConfigured = (webhooks.data ?? []).some((w) => w.enabled);

  const hasAnyChannel = emailConfigured || slackConfigured || webhookConfigured;

  // The whole point of the nudge: it exists only while the gap exists.
  if (hasAnyChannel || dismissed) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-accent px-3.5 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <Bell className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {t("noAlertChannel.title")}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {t("noAlertChannel.body")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 self-end sm:self-auto sm:shrink-0">
        <Button
          size="sm"
          onClick={() => navigate("/alerts?openNotificationSettings=true")}
        >
          {t("noAlertChannel.action")}
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("noAlertChannel.dismiss")}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
