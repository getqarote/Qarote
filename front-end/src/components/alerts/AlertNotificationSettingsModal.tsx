import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ApiError } from "@/lib/api/types";
import { Loader2, Mail, BellOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useAlertNotificationSettings,
  useUpdateAlertNotificationSettings,
} from "@/hooks/useApi";

interface AlertNotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AlertNotificationSettingsModal({
  isOpen,
  onClose,
}: AlertNotificationSettingsModalProps) {
  const { workspace, isLoading: isWorkspaceLoading } = useWorkspace();
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] =
    useState(true);
  const [contactEmail, setContactEmail] = useState<string>("");
  const [notificationSeverities, setNotificationSeverities] = useState<
    string[]
  >(["critical", "warning", "info"]);

  // Query for current settings
  const { data: settingsData } = useAlertNotificationSettings(isOpen);

  // Update form data when settings load
  useEffect(() => {
    if (settingsData?.settings) {
      setEmailNotificationsEnabled(
        settingsData.settings.emailNotificationsEnabled
      );
      setContactEmail(settingsData.settings.contactEmail || "");
      setNotificationSeverities(
        settingsData.settings.notificationSeverities || [
          "critical",
          "warning",
          "info",
        ]
      );
    }
  }, [settingsData]);

  // Show loading state only if workspace is loading (settings will use placeholder data for instant display)
  const isLoading = isWorkspaceLoading || !workspace?.id;

  // Mutation for updating settings
  const updateSettingsMutation = useUpdateAlertNotificationSettings();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email if notifications are enabled
    if (emailNotificationsEnabled && !contactEmail.trim()) {
      toast.error("Please provide an email address for notifications");
      return;
    }

    if (
      emailNotificationsEnabled &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
    ) {
      toast.error("Please provide a valid email address");
      return;
    }

    // Validate at least one severity is selected
    if (emailNotificationsEnabled && notificationSeverities.length === 0) {
      toast.error("Please select at least one alert severity");
      return;
    }

    updateSettingsMutation.mutate(
      {
        emailNotificationsEnabled,
        contactEmail: emailNotificationsEnabled ? contactEmail : null,
        notificationSeverities: emailNotificationsEnabled
          ? notificationSeverities
          : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Alert notification settings updated successfully");
          onClose();
        },
        onError: (error: ApiError) => {
          toast.error(error.message || "Failed to update settings");
        },
      }
    );
  };

  // Show modal immediately, but show loading state only if workspace is loading
  // Settings will use placeholder data for instant display
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alert Notification Settings</DialogTitle>
            <DialogDescription>Loading workspace...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Alert Notification Settings
          </DialogTitle>
          <DialogDescription>
            Configure email notifications for new alerts. Select which alert
            severities you want to receive notifications for.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Notifications Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications" className="text-base">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive email alerts for new alerts based on your severity
                preferences
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotificationsEnabled}
              onCheckedChange={setEmailNotificationsEnabled}
              disabled={updateSettingsMutation.isPending}
              className="data-[state=checked]:bg-gradient-button"
            />
          </div>

          {/* Alert Severity Selection */}
          {emailNotificationsEnabled && (
            <div className="space-y-3 p-4 border rounded-lg">
              <Label className="text-base">Alert Severities</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select which alert severities you want to receive email
                notifications for
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="severity-critical"
                    checked={notificationSeverities.includes("critical")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setNotificationSeverities([
                          ...notificationSeverities,
                          "critical",
                        ]);
                      } else {
                        setNotificationSeverities(
                          notificationSeverities.filter((s) => s !== "critical")
                        );
                      }
                    }}
                    disabled={updateSettingsMutation.isPending}
                    className="data-[state=checked]:bg-gradient-button data-[state=checked]:border-gradient-button"
                  />
                  <Label
                    htmlFor="severity-critical"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-red-600 font-medium">Critical</span>
                    <span className="text-xs text-muted-foreground">
                      - Immediate action required
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="severity-warning"
                    checked={notificationSeverities.includes("warning")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setNotificationSeverities([
                          ...notificationSeverities,
                          "warning",
                        ]);
                      } else {
                        setNotificationSeverities(
                          notificationSeverities.filter((s) => s !== "warning")
                        );
                      }
                    }}
                    disabled={updateSettingsMutation.isPending}
                    className="data-[state=checked]:bg-gradient-button data-[state=checked]:border-gradient-button"
                  />
                  <Label
                    htmlFor="severity-warning"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-yellow-600 font-medium">Warning</span>
                    <span className="text-xs text-muted-foreground">
                      - Attention recommended
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="severity-info"
                    checked={notificationSeverities.includes("info")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setNotificationSeverities([
                          ...notificationSeverities,
                          "info",
                        ]);
                      } else {
                        setNotificationSeverities(
                          notificationSeverities.filter((s) => s !== "info")
                        );
                      }
                    }}
                    disabled={updateSettingsMutation.isPending}
                    className="data-[state=checked]:bg-gradient-button data-[state=checked]:border-gradient-button"
                  />
                  <Label
                    htmlFor="severity-info"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-blue-600 font-medium">Info</span>
                    <span className="text-xs text-muted-foreground">
                      - Informational alerts
                    </span>
                  </Label>
                </div>
              </div>
              {notificationSeverities.length === 0 && (
                <p className="text-xs text-red-500 mt-2">
                  Please select at least one alert severity
                </p>
              )}
            </div>
          )}

          {/* Contact Email Input */}
          {emailNotificationsEnabled && (
            <div className="space-y-2">
              <Label htmlFor="contact-email">
                Notification Email Address
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="your-email@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={updateSettingsMutation.isPending}
                required={emailNotificationsEnabled}
              />
              <p className="text-xs text-muted-foreground">
                This email will receive notifications for new alerts
              </p>
            </div>
          )}

          {/* Info Alert */}
          {!emailNotificationsEnabled && (
            <Alert>
              <BellOff className="h-4 w-4" />
              <AlertDescription>
                Email notifications are disabled. You won't receive alerts via
                email, but you can still view them in the dashboard.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateSettingsMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="bg-gradient-button hover:bg-gradient-button-hover text-white"
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
