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
import {
  Loader2,
  Mail,
  BellOff,
  Bell,
  Webhook,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  MessageSquare,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useAlertNotificationSettings,
  useUpdateAlertNotificationSettings,
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useSlackConfigs,
  useCreateSlackConfig,
  useUpdateSlackConfig,
  useDeleteSlackConfig,
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
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] =
    useState(false);
  const [browserNotificationSeverities, setBrowserNotificationSeverities] =
    useState<string[]>(["critical", "warning", "info"]);

  // Track if this is the initial load to prevent auto-save on mount
  const isInitialMount = React.useRef(true);

  // Query for current settings
  const { data: settingsData } = useAlertNotificationSettings(isOpen);

  // Webhook hooks (must be called before any early returns)
  const { data: webhooksData } = useWebhooks(isOpen);
  const createWebhookMutation = useCreateWebhook();
  const updateWebhookMutation = useUpdateWebhook();
  const deleteWebhookMutation = useDeleteWebhook();

  // Slack hooks (must be called before any early returns)
  const { data: slackConfigsData } = useSlackConfigs(isOpen);
  const createSlackConfigMutation = useCreateSlackConfig();
  const updateSlackConfigMutation = useUpdateSlackConfig();
  const deleteSlackConfigMutation = useDeleteSlackConfig();

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
      setBrowserNotificationsEnabled(
        settingsData.settings.browserNotificationsEnabled ?? false
      );
      setBrowserNotificationSeverities(
        settingsData.settings.browserNotificationSeverities || [
          "critical",
          "warning",
          "info",
        ]
      );
      // Mark initial load as complete after settings are loaded
      // Use a small delay to ensure state updates are complete
      const timeoutId = setTimeout(() => {
        isInitialMount.current = false;
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [settingsData]);

  // Update webhook fields from first webhook (if exists)
  useEffect(() => {
    const webhooks = webhooksData?.webhooks || [];
    const firstWebhook = webhooks[0];
    if (firstWebhook) {
      setWebhookUrl(firstWebhook.url);
      setWebhookSecret(firstWebhook.secret || "");
      setWebhookEnabled(firstWebhook.enabled);
    } else {
      setWebhookUrl("");
      setWebhookSecret("");
      setWebhookEnabled(true);
    }
  }, [webhooksData]);

  // Update Slack fields from first Slack config (if exists)
  useEffect(() => {
    const slackConfigs = slackConfigsData?.slackConfigs || [];
    const firstSlack = slackConfigs[0];
    if (firstSlack) {
      setSlackWebhookUrl(firstSlack.webhookUrl);
      setSlackCustomValue(firstSlack.customValue || "");
      setSlackEnabled(firstSlack.enabled);
    } else {
      setSlackWebhookUrl("");
      setSlackCustomValue("");
      setSlackEnabled(true);
    }
  }, [slackConfigsData]);

  // Show loading state only if workspace is loading (settings will use placeholder data for instant display)
  const isLoading = isWorkspaceLoading || !workspace?.id;

  // Mutation for updating settings
  const updateSettingsMutation = useUpdateAlertNotificationSettings();

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [showSecret, setShowSecret] = useState(false);

  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [slackCustomValue, setSlackCustomValue] = useState("");
  const [slackEnabled, setSlackEnabled] = useState(true);

  const [showWebhookExample, setShowWebhookExample] = useState(false);
  const [webhookExampleVersion, setWebhookExampleVersion] = useState("v1");

  // Auto-save function for email notifications and severities
  // Use refs to access latest values without causing re-renders
  const emailNotificationsEnabledRef = React.useRef(emailNotificationsEnabled);
  const contactEmailRef = React.useRef(contactEmail);
  const notificationSeveritiesRef = React.useRef(notificationSeverities);
  const browserNotificationsEnabledRef = React.useRef(
    browserNotificationsEnabled
  );
  const browserNotificationSeveritiesRef = React.useRef(
    browserNotificationSeverities
  );

  // Keep refs in sync with state
  React.useEffect(() => {
    emailNotificationsEnabledRef.current = emailNotificationsEnabled;
  }, [emailNotificationsEnabled]);
  React.useEffect(() => {
    contactEmailRef.current = contactEmail;
  }, [contactEmail]);
  React.useEffect(() => {
    notificationSeveritiesRef.current = notificationSeverities;
  }, [notificationSeverities]);
  React.useEffect(() => {
    browserNotificationsEnabledRef.current = browserNotificationsEnabled;
  }, [browserNotificationsEnabled]);
  React.useEffect(() => {
    browserNotificationSeveritiesRef.current = browserNotificationSeverities;
  }, [browserNotificationSeverities]);

  const autoSaveSettings = React.useCallback(
    (skipValidation = false) => {
      const currentEnabled = emailNotificationsEnabledRef.current;
      const currentEmail = contactEmailRef.current;
      const currentSeverities = notificationSeveritiesRef.current;
      const currentBrowserEnabled = browserNotificationsEnabledRef.current;
      const currentBrowserSeverities = browserNotificationSeveritiesRef.current;

      // Validate email if notifications are enabled
      if (!skipValidation && currentEnabled) {
        if (!currentEmail.trim()) {
          toast.error("Please provide an email address for notifications");
          return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) {
          toast.error("Please provide a valid email address");
          return;
        }

        // Validate at least one severity is selected
        if (currentSeverities.length === 0) {
          toast.error("Please select at least one alert severity");
          return;
        }
      }

      // Validate browser notification severities
      if (!skipValidation && currentBrowserEnabled) {
        if (currentBrowserSeverities.length === 0) {
          toast.error(
            "Please select at least one alert severity for browser notifications"
          );
          return;
        }
      }

      updateSettingsMutation.mutate(
        {
          emailNotificationsEnabled: currentEnabled,
          contactEmail: currentEnabled ? currentEmail : null,
          notificationSeverities: currentEnabled
            ? currentSeverities
            : undefined,
          browserNotificationsEnabled: currentBrowserEnabled,
          browserNotificationSeverities: currentBrowserEnabled
            ? currentBrowserSeverities
            : undefined,
        },
        {
          onSuccess: () => {
            toast.success("Settings updated successfully");
          },
          onError: (error: ApiError) => {
            toast.error(error.message || "Failed to update settings");
          },
        }
      );
    },
    [updateSettingsMutation]
  );

  // Auto-save when email notifications toggle changes
  React.useEffect(() => {
    if (isInitialMount.current) return;

    const timeoutId = setTimeout(() => {
      autoSaveSettings(!emailNotificationsEnabled); // Skip validation when toggling off
    }, 100);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailNotificationsEnabled]);

  // Email input changes - no auto-save, only save on button click

  // Auto-save when severities change
  React.useEffect(() => {
    if (isInitialMount.current) return;

    const timeoutId = setTimeout(() => {
      if (emailNotificationsEnabled) {
        autoSaveSettings();
      }
    }, 100);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationSeverities]);

  // Auto-save when browser notifications toggle changes
  React.useEffect(() => {
    if (isInitialMount.current) return;

    const timeoutId = setTimeout(() => {
      autoSaveSettings(!browserNotificationsEnabled); // Skip validation when toggling off
    }, 100);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserNotificationsEnabled]);

  // Auto-save when browser notification severities change
  React.useEffect(() => {
    if (isInitialMount.current) return;

    const timeoutId = setTimeout(() => {
      if (browserNotificationsEnabled) {
        autoSaveSettings();
      }
    }, 100);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserNotificationSeverities]);

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

  const webhooks = webhooksData?.webhooks || [];
  const firstWebhook = webhooks[0];

  const handleSaveWebhook = () => {
    if (!webhookUrl.trim()) {
      toast.error("Please provide a webhook URL");
      return;
    }

    // Validate URL format
    let urlObj: URL;
    try {
      urlObj = new URL(webhookUrl.trim());
    } catch {
      toast.error("Please provide a valid webhook URL");
      return;
    }

    // Prevent Slack webhook URLs in general webhook section
    if (urlObj.hostname === "hooks.slack.com") {
      toast.error(
        "Slack webhook URLs should be added in the Slack Notifications section, not here."
      );
      return;
    }

    if (firstWebhook) {
      // Update existing webhook
      updateWebhookMutation.mutate(
        {
          webhookId: firstWebhook.id,
          data: {
            url: webhookUrl.trim(),
            enabled: webhookEnabled,
            secret: webhookSecret.trim() || null,
          },
        },
        {
          onSuccess: () => {
            toast.success("Webhook updated successfully");
          },
          onError: (error: ApiError) => {
            toast.error(error.message || "Failed to update webhook");
          },
        }
      );
    } else {
      // Create new webhook
      createWebhookMutation.mutate(
        {
          url: webhookUrl.trim(),
          enabled: webhookEnabled,
          secret: webhookSecret.trim() || null,
        },
        {
          onSuccess: () => {
            toast.success("Webhook created successfully");
          },
          onError: (error: ApiError) => {
            toast.error(error.message || "Failed to create webhook");
          },
        }
      );
    }
  };

  const handleDeleteWebhook = () => {
    if (!firstWebhook) return;
    deleteWebhookMutation.mutate(firstWebhook.id, {
      onSuccess: () => {
        toast.success("Webhook deleted successfully");
        setWebhookUrl("");
        setWebhookSecret("");
        setWebhookEnabled(true);
      },
      onError: (error: ApiError) => {
        toast.error(error.message || "Failed to delete webhook");
      },
    });
  };

  const slackConfigs = slackConfigsData?.slackConfigs || [];
  const firstSlack = slackConfigs[0];

  const handleSaveSlack = () => {
    if (!slackWebhookUrl.trim()) {
      toast.error("Please provide a Slack webhook URL");
      return;
    }

    // Validate URL format
    let urlObj: URL;
    try {
      urlObj = new URL(slackWebhookUrl.trim());
    } catch {
      toast.error("Please provide a valid webhook URL");
      return;
    }

    // Validate Slack webhook URL format
    if (
      urlObj.hostname !== "hooks.slack.com" ||
      !urlObj.pathname.startsWith("/services/") ||
      urlObj.pathname.split("/").length < 4
    ) {
      toast.error(
        "Invalid Slack webhook URL. Must be in the format: https://hooks.slack.com/services/"
      );
      return;
    }

    if (firstSlack) {
      // Update existing Slack config
      updateSlackConfigMutation.mutate(
        {
          slackConfigId: firstSlack.id,
          data: {
            webhookUrl: slackWebhookUrl.trim(),
            customValue: slackCustomValue.trim() || null,
            enabled: slackEnabled,
          },
        },
        {
          onSuccess: () => {
            toast.success("Slack configuration updated successfully");
          },
          onError: (error: ApiError) => {
            // Extract validation error message from API response
            let errorMessage = "Failed to update Slack configuration";

            if (error.message) {
              errorMessage = error.message;
            } else if (typeof error === "object" && error !== null) {
              // Check for Hono validation error format
              if ("error" in error) {
                const errorObj = error as unknown as {
                  error: { issues: { message: string }[] };
                };
                // Hono zValidator returns errors in format: { success: false, error: { issues: [...] } }
                if (
                  errorObj.error?.issues &&
                  Array.isArray(errorObj.error.issues)
                ) {
                  const firstIssue = errorObj.error.issues[0];
                  errorMessage = firstIssue?.message || String(errorObj.error);
                } else {
                  errorMessage = String(errorObj.error);
                }
              }
            }

            toast.error(errorMessage);
          },
        }
      );
    } else {
      // Create new Slack config
      createSlackConfigMutation.mutate(
        {
          webhookUrl: slackWebhookUrl.trim(),
          customValue: slackCustomValue.trim() || null,
          enabled: slackEnabled,
        },
        {
          onSuccess: () => {
            toast.success("Slack configuration created successfully");
          },
          onError: (error: ApiError) => {
            // Extract validation error message from API response
            let errorMessage = "Failed to create Slack configuration";

            if (error.message) {
              errorMessage = error.message;
            } else if (typeof error === "object" && error !== null) {
              // Check for Hono validation error format
              if ("error" in error) {
                const errorObj = error as unknown as {
                  error: { issues: { message: string }[] };
                };
                // Hono zValidator returns errors in format: { success: false, error: { issues: [...] } }
                if (
                  errorObj.error?.issues &&
                  Array.isArray(errorObj.error.issues)
                ) {
                  const firstIssue = errorObj.error.issues[0];
                  errorMessage = firstIssue?.message || String(errorObj.error);
                } else {
                  errorMessage = String(errorObj.error);
                }
              }
            }

            toast.error(errorMessage);
          },
        }
      );
    }
  };

  const handleDeleteSlack = () => {
    if (!firstSlack) return;
    deleteSlackConfigMutation.mutate(firstSlack.id, {
      onSuccess: () => {
        toast.success("Slack configuration deleted successfully");
        setSlackWebhookUrl("");
        setSlackCustomValue("");
        setSlackEnabled(true);
      },
      onError: (error: ApiError) => {
        toast.error(error.message || "Failed to delete Slack configuration");
      },
    });
  };

  const handleToggleSlack = (enabled: boolean) => {
    setSlackEnabled(enabled);
    if (!firstSlack) return; // Just update local state if no config exists yet
    updateSlackConfigMutation.mutate(
      {
        slackConfigId: firstSlack.id,
        data: { enabled },
      },
      {
        onError: (error: ApiError) => {
          toast.error(error.message || "Failed to update Slack configuration");
          // Revert state on error
          setSlackEnabled(!enabled);
        },
      }
    );
  };

  const handleToggleWebhook = (enabled: boolean) => {
    setWebhookEnabled(enabled);
    if (!firstWebhook) return; // Just update local state if no webhook exists yet
    updateWebhookMutation.mutate(
      {
        webhookId: firstWebhook.id,
        data: { enabled },
      },
      {
        onSuccess: () => {
          toast.success(`Webhook ${enabled ? "enabled" : "disabled"}`);
        },
        onError: (error: ApiError) => {
          toast.error(error.message || "Failed to update webhook");
          // Revert state on error
          setWebhookEnabled(!enabled);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Alert Notification Settings
          </DialogTitle>
          <DialogDescription>
            Configure email and webhook notifications for new alerts. Select
            which alert severities you want to receive notifications for.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alert Severity Selection */}
          <div className="space-y-3 p-4 border rounded-lg">
            <Label className="text-base">Alert Severities</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select which alert severities you want to receive notifications
              for (applies to email, webhook, and Slack notifications)
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="severity-critical"
                  checked={notificationSeverities.includes("critical")}
                  onCheckedChange={(checked) => {
                    const newSeverities = checked
                      ? [...notificationSeverities, "critical"]
                      : notificationSeverities.filter((s) => s !== "critical");
                    setNotificationSeverities(newSeverities);
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
                    const newSeverities = checked
                      ? [...notificationSeverities, "warning"]
                      : notificationSeverities.filter((s) => s !== "warning");
                    setNotificationSeverities(newSeverities);
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
                    const newSeverities = checked
                      ? [...notificationSeverities, "info"]
                      : notificationSeverities.filter((s) => s !== "info");
                    setNotificationSeverities(newSeverities);
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

          {/* Browser Notifications Section */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="browser-notifications"
                  className="text-base flex items-center gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Browser Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive browser notifications for new alerts. You'll be
                  prompted to allow notifications when you enable this feature.
                </p>
              </div>
              <Switch
                id="browser-notifications"
                checked={browserNotificationsEnabled}
                onCheckedChange={setBrowserNotificationsEnabled}
                disabled={updateSettingsMutation.isPending}
                className="data-[state=checked]:bg-gradient-button"
              />
            </div>

            {browserNotificationsEnabled && (
              <div className="mt-4 space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium">
                  Browser Notification Severities
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Select which alert severities you want to receive browser
                  notifications for
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="browser-severity-critical"
                      checked={browserNotificationSeverities.includes(
                        "critical"
                      )}
                      onCheckedChange={(checked) => {
                        const newSeverities = checked
                          ? [...browserNotificationSeverities, "critical"]
                          : browserNotificationSeverities.filter(
                              (s) => s !== "critical"
                            );
                        setBrowserNotificationSeverities(newSeverities);
                      }}
                      disabled={updateSettingsMutation.isPending}
                      className="data-[state=checked]:bg-gradient-button data-[state=checked]:border-gradient-button"
                    />
                    <Label
                      htmlFor="browser-severity-critical"
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
                      id="browser-severity-warning"
                      checked={browserNotificationSeverities.includes(
                        "warning"
                      )}
                      onCheckedChange={(checked) => {
                        const newSeverities = checked
                          ? [...browserNotificationSeverities, "warning"]
                          : browserNotificationSeverities.filter(
                              (s) => s !== "warning"
                            );
                        setBrowserNotificationSeverities(newSeverities);
                      }}
                      disabled={updateSettingsMutation.isPending}
                      className="data-[state=checked]:bg-gradient-button data-[state=checked]:border-gradient-button"
                    />
                    <Label
                      htmlFor="browser-severity-warning"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-yellow-600 font-medium">
                        Warning
                      </span>
                      <span className="text-xs text-muted-foreground">
                        - Attention recommended
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="browser-severity-info"
                      checked={browserNotificationSeverities.includes("info")}
                      onCheckedChange={(checked) => {
                        const newSeverities = checked
                          ? [...browserNotificationSeverities, "info"]
                          : browserNotificationSeverities.filter(
                              (s) => s !== "info"
                            );
                        setBrowserNotificationSeverities(newSeverities);
                      }}
                      disabled={updateSettingsMutation.isPending}
                      className="data-[state=checked]:bg-gradient-button data-[state=checked]:border-gradient-button"
                    />
                    <Label
                      htmlFor="browser-severity-info"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-blue-600 font-medium">Info</span>
                      <span className="text-xs text-muted-foreground">
                        - Informational alerts
                      </span>
                    </Label>
                  </div>
                </div>
                {browserNotificationSeverities.length === 0 && (
                  <p className="text-xs text-red-500 mt-2">
                    Please select at least one alert severity for browser
                    notifications
                  </p>
                )}
              </div>
            )}

            {!browserNotificationsEnabled && (
              <Alert className="mt-4">
                <BellOff className="h-4 w-4" />
                <AlertDescription>
                  Browser notifications are disabled. Enable this feature to
                  receive desktop notifications for new alerts.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Divider */}
          <hr className="border-t border-border" />

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

          {/* Contact Email Input */}
          {emailNotificationsEnabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="contact-email">
                  Notification Email Address
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (contactEmail.trim() && emailNotificationsEnabled) {
                      autoSaveSettings();
                    }
                  }}
                  disabled={
                    updateSettingsMutation.isPending || !contactEmail.trim()
                  }
                  className="bg-gradient-button hover:bg-gradient-button-hover text-white hover:text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Update
                </Button>
              </div>
              <Input
                id="contact-email"
                type="email"
                placeholder="your-email@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                onKeyDown={(e) => {
                  // Save on Enter key
                  if (
                    e.key === "Enter" &&
                    contactEmail.trim() &&
                    emailNotificationsEnabled
                  ) {
                    e.preventDefault();
                    autoSaveSettings();
                  }
                }}
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

          {/* Webhooks Section */}
          <div className="space-y-4 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                <Label className="text-base">Webhook Notifications</Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowWebhookExample(true)}
              >
                View Example Payload
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure webhook endpoint to receive alert notifications via POST
              requests.
            </p>

            <div className="p-4 border rounded-lg space-y-3">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">
                  Webhook URL
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://your-endpoint.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  disabled={
                    createWebhookMutation.isPending ||
                    updateWebhookMutation.isPending
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-secret">Secret (Optional)</Label>
                <div className="relative">
                  <Input
                    id="webhook-secret"
                    type={showSecret ? "text" : "password"}
                    placeholder="Secret for HMAC signature"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    disabled={
                      createWebhookMutation.isPending ||
                      updateWebhookMutation.isPending
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowSecret(!showSecret)}
                    disabled={
                      createWebhookMutation.isPending ||
                      updateWebhookMutation.isPending
                    }
                  >
                    {showSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional secret key for webhook signature verification
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="webhook-enabled"
                    checked={webhookEnabled}
                    onCheckedChange={handleToggleWebhook}
                    disabled={
                      createWebhookMutation.isPending ||
                      updateWebhookMutation.isPending
                    }
                    className="data-[state=checked]:bg-gradient-button"
                  />
                  <Label htmlFor="webhook-enabled">Enabled</Label>
                </div>
                <div className="flex gap-2">
                  {firstWebhook && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteWebhook}
                      disabled={deleteWebhookMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveWebhook}
                    disabled={
                      createWebhookMutation.isPending ||
                      updateWebhookMutation.isPending ||
                      !webhookUrl.trim()
                    }
                    className="bg-gradient-button hover:bg-gradient-button-hover text-white hover:text-white"
                  >
                    {createWebhookMutation.isPending ||
                    updateWebhookMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {firstWebhook ? "Updating..." : "Creating..."}
                      </>
                    ) : firstWebhook ? (
                      "Update"
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Slack Section */}
          <div className="space-y-4 pt-6 border-t">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <Label className="text-base">Slack Notifications</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure Slack webhook to receive alert notifications in your
              Slack channels.
            </p>

            <div className="space-y-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="slack-webhook-url">
                  Slack Webhook URL
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="slack-webhook-url"
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  disabled={
                    createSlackConfigMutation.isPending ||
                    updateSlackConfigMutation.isPending
                  }
                />
                <p className="text-xs text-muted-foreground">
                  You can get Slack Incoming Webhook URL in{" "}
                  <a
                    href="https://api.slack.com/messaging/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    Slack's Apps &gt; Incoming WebHooks
                  </a>
                  .
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slack-custom-value">
                  Custom value (Optional)
                </Label>
                <Input
                  id="slack-custom-value"
                  type="text"
                  placeholder="e.g., Custom message to add to notifications"
                  value={slackCustomValue}
                  onChange={(e) => setSlackCustomValue(e.target.value)}
                  disabled={
                    createSlackConfigMutation.isPending ||
                    updateSlackConfigMutation.isPending
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Text that'll be added to body of each notification.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={slackEnabled}
                    onCheckedChange={handleToggleSlack}
                    disabled={
                      createSlackConfigMutation.isPending ||
                      updateSlackConfigMutation.isPending
                    }
                    className="data-[state=checked]:bg-gradient-button"
                  />
                  <Label htmlFor="slack-enabled">Enabled</Label>
                </div>
                <div className="flex gap-2">
                  {firstSlack && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteSlack}
                      disabled={deleteSlackConfigMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={handleSaveSlack}
                    disabled={
                      createSlackConfigMutation.isPending ||
                      updateSlackConfigMutation.isPending ||
                      !slackWebhookUrl.trim()
                    }
                    className="bg-gradient-button hover:bg-gradient-button-hover text-white hover:text-white"
                  >
                    {createSlackConfigMutation.isPending ||
                    updateSlackConfigMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {firstSlack ? "Updating..." : "Creating..."}
                      </>
                    ) : firstSlack ? (
                      "Update"
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateSettingsMutation.isPending}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Webhook Example Payload Modal */}
      <Dialog open={showWebhookExample} onOpenChange={setShowWebhookExample}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Webhook Payload Example</DialogTitle>
            <DialogDescription>
              This is an example of the JSON payload that will be sent to your
              webhook endpoint when alerts are triggered.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="webhook-version"
                className="text-sm font-semibold"
              >
                Version:
              </Label>
              <select
                id="webhook-version"
                value={webhookExampleVersion}
                onChange={(e) => setWebhookExampleVersion(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-md bg-background"
              >
                <option value="v1">v1</option>
              </select>
              <span className="text-xs text-muted-foreground">
                (Only v1 is currently available)
              </span>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">HTTP Headers</Label>
              <div className="p-4 bg-muted rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  {`Content-Type: application/json
User-Agent: RabbitHQ-Webhook/1.0
X-RabbitHQ-Event: alert.notification
X-RabbitHQ-Version: ${webhookExampleVersion}
X-RabbitHQ-Timestamp: 2024-01-15T10:30:00.000Z
X-RabbitHQ-Signature: sha256=abc123... (if secret is configured)`}
                </pre>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">JSON Payload</Label>
              <div className="p-4 bg-muted rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(
                    {
                      version: webhookExampleVersion,
                      event: "alert.notification",
                      timestamp: "2024-01-15T10:30:00.000Z",
                      workspace: {
                        id: "workspace-123",
                        name: "My Workspace",
                      },
                      server: {
                        id: "server-456",
                        name: "Production RabbitMQ",
                      },
                      alerts: [
                        {
                          id: "alert-789",
                          serverId: "server-456",
                          serverName: "Production RabbitMQ",
                          severity: "critical",
                          category: "memory",
                          title: "High Memory Usage",
                          description:
                            "Memory usage has exceeded the threshold of 80%",
                          details: {
                            current: "85%",
                            threshold: 80,
                            recommended:
                              "Consider adding more memory or reducing queue sizes",
                            affected: ["node1", "node2"],
                          },
                          timestamp: "2024-01-15T10:30:00.000Z",
                          resolved: false,
                          source: {
                            type: "node",
                            name: "rabbit@node1",
                          },
                        },
                        {
                          id: "alert-790",
                          serverId: "server-456",
                          serverName: "Production RabbitMQ",
                          severity: "warning",
                          category: "disk",
                          title: "Disk Space Warning",
                          description:
                            "Disk usage is approaching the threshold of 90%",
                          details: {
                            current: "87%",
                            threshold: 90,
                            recommended:
                              "Consider cleaning up old logs or increasing disk space",
                          },
                          timestamp: "2024-01-15T10:25:00.000Z",
                          resolved: false,
                          source: {
                            type: "node",
                            name: "rabbit@node1",
                          },
                        },
                      ],
                      summary: {
                        total: 2,
                        critical: 1,
                        warning: 1,
                        info: 0,
                      },
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> If you configure a secret, the payload
                will include an{" "}
                <code className="font-mono">X-RabbitHQ-Signature</code> header
                with an HMAC-SHA256 signature. You can use this to verify the
                authenticity of the webhook request.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowWebhookExample(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
