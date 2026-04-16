import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { EmailTabProps } from "./types";

export function EmailTab({
  emailNotificationsEnabled,
  setEmailNotificationsEnabled,
  contactEmail,
  setContactEmail,
  onSaveEmail,
  isPending,
}: EmailTabProps) {
  const { t } = useTranslation("alerts");

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="email-notifications" className="text-base">
            {t("modal.emailNotifications")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("modal.emailNotificationsDescription")}
          </p>
        </div>
        <Switch
          id="email-notifications"
          checked={emailNotificationsEnabled}
          onCheckedChange={setEmailNotificationsEnabled}
          disabled={isPending}
        />
      </div>

      {/* Email Input */}
      {emailNotificationsEnabled && (
        <div className="space-y-2 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="contact-email">
              {t("modal.notificationEmailAddress")}
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Button
              type="button"
              size="sm"
              onClick={onSaveEmail}
              disabled={isPending || !contactEmail.trim()}
              className="btn-primary"
            >
              {t("modal.update")}
            </Button>
          </div>
          <Input
            id="contact-email"
            type="email"
            placeholder="your-email@example.com"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                contactEmail.trim() &&
                emailNotificationsEnabled
              ) {
                e.preventDefault();
                onSaveEmail();
              }
            }}
            disabled={isPending}
            required={emailNotificationsEnabled}
          />
          <p className="text-xs text-muted-foreground">
            {t("modal.emailHelp")}
          </p>
        </div>
      )}

      {/* Disabled Info */}
      {!emailNotificationsEnabled && (
        <p className="text-sm text-muted-foreground">
          {t("modal.emailNotificationsDisabled")}
        </p>
      )}
    </div>
  );
}
