import { BellOff } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { SeverityCheckboxGroup } from "./SeverityCheckboxGroup";
import type { BrowserTabProps } from "./types";

export function BrowserTab({
  browserNotificationsEnabled,
  setBrowserNotificationsEnabled,
  browserNotificationSeverities,
  setBrowserNotificationSeverities,
  notificationPermission,
  setNotificationPermission,
  isPending,
  t,
}: BrowserTabProps) {
  const handleToggle = (checked: boolean) => {
    if (!checked) {
      setBrowserNotificationsEnabled(false);
      return;
    }
    if (!("Notification" in window)) {
      setBrowserNotificationsEnabled(false);
      setNotificationPermission("unsupported");
      return;
    }
    if (Notification.permission === "granted") {
      setBrowserNotificationsEnabled(true);
      return;
    }
    if (Notification.permission === "denied") {
      setBrowserNotificationsEnabled(false);
      setNotificationPermission("denied");
      return;
    }
    Notification.requestPermission().then((permission) => {
      setNotificationPermission(permission);
      setBrowserNotificationsEnabled(permission === "granted");
    });
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label
            htmlFor="browser-notifications"
            className="text-base flex items-center gap-2"
          >
            {t("modal.browserNotifications")}
            {notificationPermission === "granted" && (
              <Badge
                variant="secondary"
                className="text-xs font-normal text-success"
              >
                {t("modal.permissionGranted")}
              </Badge>
            )}
            {notificationPermission === "denied" && (
              <Badge variant="destructive" className="text-xs font-normal">
                {t("modal.permissionDenied")}
              </Badge>
            )}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("modal.browserNotificationsDescription")}
          </p>
        </div>
        <Switch
          id="browser-notifications"
          checked={browserNotificationsEnabled}
          onCheckedChange={handleToggle}
          disabled={isPending}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      {/* Permission blocked alert */}
      {"Notification" in window &&
        browserNotificationsEnabled &&
        notificationPermission === "denied" && (
          <Alert variant="destructive">
            <BellOff className="h-4 w-4" />
            <AlertDescription>
              {t("modal.browserNotificationsBlocked")}
            </AlertDescription>
          </Alert>
        )}

      {/* System hint */}
      {browserNotificationsEnabled && notificationPermission === "granted" && (
        <p className="text-xs text-muted-foreground">
          {t("modal.browserNotificationsSystemHint")}
        </p>
      )}

      {/* Browser Severities */}
      {browserNotificationsEnabled && (
        <div className="space-y-3 p-4 border rounded-lg">
          <Label className="text-sm font-medium">
            {t("modal.browserNotificationSeverities")}
          </Label>
          <p className="text-xs text-muted-foreground mb-3">
            {t("modal.browserNotificationSeveritiesDescription")}
          </p>
          <SeverityCheckboxGroup
            severities={browserNotificationSeverities}
            onChange={setBrowserNotificationSeverities}
            disabled={isPending}
            idPrefix="browser-severity"
            t={t}
          />
          {browserNotificationSeverities.length === 0 && (
            <p className="text-xs text-destructive mt-2">
              {t("modal.selectAtLeastOneBrowserSeverity")}
            </p>
          )}
        </div>
      )}

      {/* Disabled Info */}
      {!browserNotificationsEnabled && (
        <Alert>
          <BellOff className="h-4 w-4" />
          <AlertDescription>
            {t("modal.browserNotificationsDisabled")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
