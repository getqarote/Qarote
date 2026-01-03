import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Webhook,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/types";
import { logger } from "@/lib/logger";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

import {
  useAlertNotificationSettings,
  useCreateSlackConfig,
  useCreateWebhook,
  useDeleteSlackConfig,
  useDeleteWebhook,
  useSlackConfigs,
  useUpdateAlertNotificationSettings,
  useUpdateSlackConfig,
  useUpdateWebhook,
  useWebhooks,
} from "@/hooks/queries/useAlerts";
import { useServers } from "@/hooks/queries/useServer";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

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
  const [notificationServerIds, setNotificationServerIds] = useState<
    string[] | null
  >(null);
  const [serverSearchOpen, setServerSearchOpen] = useState(false);
  const [serverSearchTerm, setServerSearchTerm] = useState<string>("");

  // Track if this is the initial load to prevent auto-save on mount
  const isInitialMount = useRef(true);

  // Query for current settings
  const { data: settingsData } = useAlertNotificationSettings(isOpen);

  // Query for servers
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  // Get selected server objects
  const selectedServers = useMemo(() => {
    if (!notificationServerIds || notificationServerIds.length === 0) return [];
    return servers.filter((server) =>
      notificationServerIds.includes(server.id)
    );
  }, [servers, notificationServerIds]);

  // Filter servers based on search term (excluding already selected)
  const availableServers = useMemo(() => {
    const selectedIds = notificationServerIds || [];
    return servers.filter((server) => !selectedIds.includes(server.id));
  }, [servers, notificationServerIds]);

  const filteredServers = useMemo(() => {
    if (!serverSearchTerm.trim()) return availableServers;
    const searchLower = serverSearchTerm.toLowerCase();
    return availableServers.filter(
      (server) =>
        server.name.toLowerCase().includes(searchLower) ||
        server.host.toLowerCase().includes(searchLower) ||
        server.port.toString().includes(searchLower)
    );
  }, [availableServers, serverSearchTerm]);

  // Selected servers count
  const selectedCount = notificationServerIds?.length || 0;

  // Webhook hooks (must be called before any early returns)
  const { data: webhooks = [] } = useWebhooks(isOpen);
  const createWebhookMutation = useCreateWebhook();
  const updateWebhookMutation = useUpdateWebhook();
  const deleteWebhookMutation = useDeleteWebhook();

  // Slack hooks (must be called before any early returns)
  const { data: slackConfigs = [] } = useSlackConfigs(isOpen);
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
      setNotificationServerIds(
        settingsData.settings.notificationServerIds || null
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
  }, [webhooks]);

  // Update Slack fields from first Slack config (if exists)
  useEffect(() => {
    const firstSlack = slackConfigs[0];
    if (firstSlack) {
      setSlackWebhookUrl(firstSlack.webhookUrl);
      setSlackEnabled(firstSlack.enabled);
    } else {
      setSlackWebhookUrl("");
      setSlackEnabled(true);
    }
  }, [slackConfigs]);

  // Show loading state only if workspace is loading (settings will use placeholder data for instant display)
  const isLoading = isWorkspaceLoading || !workspace?.id;

  // Mutation for updating settings
  const updateSettingsMutation = useUpdateAlertNotificationSettings();

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [showSecret, setShowSecret] = useState(false);

  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [slackEnabled, setSlackEnabled] = useState(true);

  const [showWebhookExample, setShowWebhookExample] = useState(false);
  const [webhookExampleVersion, setWebhookExampleVersion] = useState("v1");

  // Auto-save function for email notifications and severities
  // Use refs to access latest values without causing re-renders
  const emailNotificationsEnabledRef = useRef(emailNotificationsEnabled);
  const contactEmailRef = useRef(contactEmail);
  const notificationSeveritiesRef = useRef(notificationSeverities);
  const browserNotificationsEnabledRef = useRef(browserNotificationsEnabled);
  const browserNotificationSeveritiesRef = useRef(
    browserNotificationSeverities
  );

  // Keep refs in sync with state
  useEffect(() => {
    emailNotificationsEnabledRef.current = emailNotificationsEnabled;
  }, [emailNotificationsEnabled]);
  useEffect(() => {
    contactEmailRef.current = contactEmail;
  }, [contactEmail]);
  useEffect(() => {
    notificationSeveritiesRef.current = notificationSeverities;
  }, [notificationSeverities]);
  useEffect(() => {
    browserNotificationsEnabledRef.current = browserNotificationsEnabled;
  }, [browserNotificationsEnabled]);
  useEffect(() => {
    browserNotificationSeveritiesRef.current = browserNotificationSeverities;
  }, [browserNotificationSeverities]);

  const autoSaveSettings = useCallback(
    (
      options: {
        skipValidation?: boolean;
        onlyBrowserNotifications?: boolean;
        onlyEmailNotifications?: boolean;
      } = {}
    ) => {
      const {
        skipValidation = false,
        onlyBrowserNotifications = false,
        onlyEmailNotifications = false,
      } = options;
      const currentEnabled = emailNotificationsEnabledRef.current;
      const currentEmail = contactEmailRef.current;
      const currentSeverities = notificationSeveritiesRef.current;
      const currentBrowserEnabled = browserNotificationsEnabledRef.current;
      const currentBrowserSeverities = browserNotificationSeveritiesRef.current;

      // Validate email if notifications are enabled AND we're not only changing browser notifications
      if (!skipValidation && currentEnabled && !onlyBrowserNotifications) {
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
      if (!skipValidation && currentBrowserEnabled && !onlyEmailNotifications) {
        if (currentBrowserSeverities.length === 0) {
          toast.error(
            "Please select at least one alert severity for browser notifications"
          );
          return;
        }
      }

      // Build the update payload - only include fields that are being changed
      const updatePayload: {
        emailNotificationsEnabled?: boolean;
        contactEmail?: string | null;
        notificationSeverities?: string[];
        notificationServerIds?: string[] | null;
        browserNotificationsEnabled?: boolean;
        browserNotificationSeverities?: string[];
      } = {};

      if (onlyBrowserNotifications) {
        // Only update browser notification settings
        updatePayload.browserNotificationsEnabled = currentBrowserEnabled;
        updatePayload.browserNotificationSeverities = currentBrowserEnabled
          ? currentBrowserSeverities
          : undefined;
      } else if (onlyEmailNotifications) {
        // Only update email notification settings
        updatePayload.emailNotificationsEnabled = currentEnabled;
        updatePayload.contactEmail = currentEnabled ? currentEmail : null;
        updatePayload.notificationSeverities = currentEnabled
          ? currentSeverities
          : undefined;
        updatePayload.notificationServerIds = notificationServerIds;
      } else {
        // Update all settings
        updatePayload.emailNotificationsEnabled = currentEnabled;
        updatePayload.contactEmail = currentEnabled ? currentEmail : null;
        updatePayload.notificationSeverities = currentEnabled
          ? currentSeverities
          : undefined;
        updatePayload.notificationServerIds = notificationServerIds;
        updatePayload.browserNotificationsEnabled = currentBrowserEnabled;
        updatePayload.browserNotificationSeverities = currentBrowserEnabled
          ? currentBrowserSeverities
          : undefined;
      }

      updateSettingsMutation.mutate(updatePayload, {
        onSuccess: () => {
          toast.success("Settings updated successfully");
        },
        onError: (error: ApiError) => {
          const errorMessage = error.message || "Failed to update settings";
          toast.error(errorMessage);
          logger.error({ error }, errorMessage);
        },
      });
    },
    [updateSettingsMutation]
  );

  // Auto-save when email notifications toggle changes
  useEffect(() => {
    if (isInitialMount.current) return;

    const timeoutId = setTimeout(() => {
      autoSaveSettings({
        skipValidation: !emailNotificationsEnabled, // Skip validation when toggling off
        onlyEmailNotifications: true, // Only update email notification settings
      });
    }, 100);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailNotificationsEnabled]);

  // Email input changes - no auto-save, only save on button click

  // Auto-save when severities change
  useEffect(() => {
    if (isInitialMount.current) return;

    const timeoutId = setTimeout(() => {
      if (emailNotificationsEnabled) {
        autoSaveSettings({
          onlyEmailNotifications: true, // Only update email notification settings
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationSeverities]);

  // Auto-save when browser notifications toggle changes
  useEffect(() => {
    if (isInitialMount.current) return;

    const timeoutId = setTimeout(() => {
      autoSaveSettings({
        skipValidation: !browserNotificationsEnabled, // Skip validation when toggling off
        onlyBrowserNotifications: true, // Only update browser notification settings
      });
    }, 100);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserNotificationsEnabled]);

  // Auto-save when browser notification severities change
  useEffect(() => {
    if (isInitialMount.current) return;

    const timeoutId = setTimeout(() => {
      if (browserNotificationsEnabled) {
        autoSaveSettings({
          onlyBrowserNotifications: true, // Only update browser notification settings
        });
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
          id: firstWebhook.id,
          url: webhookUrl.trim(),
          enabled: webhookEnabled,
          secret: webhookSecret.trim() || null,
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
          id: firstSlack.id,
          webhookUrl: slackWebhookUrl.trim(),
          enabled: slackEnabled,
        },
        {
          onSuccess: () => {
            toast.success("Slack configuration updated successfully");
          },
          onError: (error: ApiError) => {
            toast.error(
              error.message || "Failed to update Slack configuration"
            );
          },
        }
      );
    } else {
      // Create new Slack config
      createSlackConfigMutation.mutate(
        {
          webhookUrl: slackWebhookUrl.trim(),
          enabled: slackEnabled,
        },
        {
          onSuccess: () => {
            toast.success("Slack configuration created successfully");
          },
          onError: (error: ApiError) => {
            toast.error(
              error.message || "Failed to create Slack configuration"
            );
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
        id: firstSlack.id,
        enabled,
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
        id: firstWebhook.id,
        enabled,
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
          {/* Server Selection */}
          {servers.length > 0 && (
            <div className="space-y-3 p-4 border rounded-lg">
              <div>
                <Label className="text-base">Servers</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Select which servers you want to receive notifications for. If
                  none are selected, notifications will be sent for all servers.
                </p>
              </div>

              {/* Selected Servers as Tags */}
              {selectedServers.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/50">
                  {selectedServers.map((server) => (
                    <Badge
                      key={server.id}
                      variant="secondary"
                      className="flex items-center gap-1.5 pr-1"
                    >
                      <span className="text-xs">
                        {server.name} ({server.host}:{server.port})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const currentIds = notificationServerIds || [];
                          const newIds = currentIds.filter(
                            (id) => id !== server.id
                          );
                          setNotificationServerIds(
                            newIds.length > 0 ? newIds : null
                          );
                        }}
                        disabled={updateSettingsMutation.isPending}
                        className="ml-1 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search Input with Popover */}
              <div className="flex items-center gap-2">
                <Popover
                  open={serverSearchOpen}
                  onOpenChange={setServerSearchOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={serverSearchOpen}
                      className="w-full justify-between"
                      disabled={updateSettingsMutation.isPending}
                    >
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {selectedCount > 0
                            ? `${selectedCount} server${selectedCount > 1 ? "s" : ""} selected`
                            : "Search and select servers..."}
                        </span>
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search servers by name, host, or port..."
                        value={serverSearchTerm}
                        onValueChange={setServerSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {serverSearchTerm
                            ? `No servers found matching "${serverSearchTerm}"`
                            : "No servers available"}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredServers.map((server) => (
                            <CommandItem
                              key={server.id}
                              value={`${server.name} ${server.host} ${server.port}`}
                              onSelect={() => {
                                const currentIds = notificationServerIds || [];
                                const newIds = [...currentIds, server.id];
                                setNotificationServerIds(newIds);
                                setServerSearchTerm("");
                                // Keep popover open for multiple selections
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {server.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {server.host}:{server.port}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNotificationServerIds(null);
                      setServerSearchOpen(false);
                    }}
                    disabled={updateSettingsMutation.isPending}
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {selectedCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedCount} of {servers.length} server
                  {servers.length > 1 ? "s" : ""} selected. Leave empty to
                  receive notifications for all servers.
                </p>
              )}
            </div>
          )}

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
                      autoSaveSettings({
                        onlyEmailNotifications: true, // Only update email notification settings
                      });
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
                    autoSaveSettings({
                      onlyEmailNotifications: true, // Only update email notification settings
                    });
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
User-Agent: Qarote-Webhook/1.0
X-Qarote-Event: alert.notification
X-Qarote-Version: ${webhookExampleVersion}
X-Qarote-Timestamp: 2024-01-15T10:30:00.000Z
X-Qarote-Signature: sha256=abc123... (if secret is configured)`}
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
                <code className="font-mono">X-Qarote-Signature</code> header
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
