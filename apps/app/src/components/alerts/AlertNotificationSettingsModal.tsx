import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Bell,
  Loader2,
  Mail,
  MessageSquare,
  Settings,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/types";
import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAuth } from "@/contexts/AuthContextDefinition";

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

import { BrowserTab } from "./notification-settings/BrowserTab";
import { EmailTab } from "./notification-settings/EmailTab";
import { GeneralTab } from "./notification-settings/GeneralTab";
import { SlackTab } from "./notification-settings/SlackTab";
import { WebhookExampleModal } from "./notification-settings/WebhookExampleModal";
import { WebhookTab } from "./notification-settings/WebhookTab";

interface AlertNotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_SERVERS: Array<{
  id: string;
  name: string;
  host: string;
  port: number;
}> = [];

function StatusDot({
  enabled,
  configured = true,
}: {
  enabled: boolean;
  configured?: boolean;
}) {
  if (!configured) return null;
  return (
    <span
      aria-hidden="true"
      className={`h-2 w-2 rounded-full shrink-0 ${
        enabled ? "bg-success" : "bg-muted-foreground/30"
      }`}
    />
  );
}

export function AlertNotificationSettingsModal({
  isOpen,
  onClose,
}: AlertNotificationSettingsModalProps) {
  const { t } = useTranslation("alerts");
  const { workspace, isLoading: isWorkspaceLoading } = useWorkspace();
  const { user } = useAuth();
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] =
    useState(true);
  const [contactEmail, setContactEmail] = useState<string>("");
  const [notificationSeverities, setNotificationSeverities] = useState<
    string[]
  >(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] =
    useState(false);
  const [browserNotificationSeverities, setBrowserNotificationSeverities] =
    useState<string[]>(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);
  const [notificationServerIds, setNotificationServerIds] = useState<
    string[] | null
  >(null);
  const [serverSearchOpen, setServerSearchOpen] = useState(false);
  const [serverSearchTerm, setServerSearchTerm] = useState<string>("");
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("Notification" in window ? Notification.permission : "unsupported");

  // Resync permission state on each open
  useEffect(() => {
    if (isOpen) {
      setNotificationPermission(
        "Notification" in window ? Notification.permission : "unsupported"
      );
    }
  }, [isOpen]);

  // Track if this is the initial load to prevent auto-save on mount
  const isInitialMount = useRef(true);

  // Query for current settings
  const { data: settingsData } = useAlertNotificationSettings(isOpen);

  // Query for servers
  const { data: serversData } = useServers();
  const servers = serversData?.servers ?? EMPTY_SERVERS;

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

  // Webhook hooks
  const { data: webhooks = [] } = useWebhooks(isOpen);
  const createWebhookMutation = useCreateWebhook();
  const updateWebhookMutation = useUpdateWebhook();
  const deleteWebhookMutation = useDeleteWebhook();

  // Slack hooks
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
      setContactEmail(
        settingsData.settings.contactEmail ||
          workspace?.contactEmail ||
          user?.email ||
          ""
      );
      setNotificationSeverities(
        settingsData.settings.notificationSeverities || [
          "CRITICAL",
          "HIGH",
          "MEDIUM",
          "LOW",
          "INFO",
        ]
      );
      setBrowserNotificationsEnabled(
        settingsData.settings.browserNotificationsEnabled ?? false
      );
      setBrowserNotificationSeverities(
        settingsData.settings.browserNotificationSeverities || [
          "CRITICAL",
          "HIGH",
          "MEDIUM",
          "LOW",
          "INFO",
        ]
      );
      setNotificationServerIds(
        settingsData.settings.notificationServerIds || null
      );
      const timeoutId = setTimeout(() => {
        isInitialMount.current = false;
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [settingsData, user?.email, workspace?.contactEmail]);

  // Update webhook fields from first webhook
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

  // Update Slack fields from first Slack config
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

  // Show loading state only if workspace is loading
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

  // Auto-save refs
  const emailNotificationsEnabledRef = useRef(emailNotificationsEnabled);
  const contactEmailRef = useRef(contactEmail);
  const notificationSeveritiesRef = useRef(notificationSeverities);
  const browserNotificationsEnabledRef = useRef(browserNotificationsEnabled);
  const browserNotificationSeveritiesRef = useRef(
    browserNotificationSeverities
  );

  // Keep refs in sync
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
        silent?: boolean;
      } = {}
    ) => {
      const {
        skipValidation = false,
        onlyBrowserNotifications = false,
        onlyEmailNotifications = false,
        silent = false,
      } = options;
      const currentEnabled = emailNotificationsEnabledRef.current;
      const currentEmail = contactEmailRef.current;
      const currentSeverities = notificationSeveritiesRef.current;
      const currentBrowserEnabled = browserNotificationsEnabledRef.current;
      const currentBrowserSeverities = browserNotificationSeveritiesRef.current;

      if (!skipValidation && currentEnabled && !onlyBrowserNotifications) {
        if (!currentEmail.trim()) {
          toast.error(t("modal.toastEmailRequired"));
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) {
          toast.error(t("modal.toastEmailInvalid"));
          return;
        }
        if (currentSeverities.length === 0) {
          toast.error(t("modal.toastSelectSeverity"));
          return;
        }
      }

      if (!skipValidation && currentBrowserEnabled && !onlyEmailNotifications) {
        if (currentBrowserSeverities.length === 0) {
          toast.error(t("modal.toastSelectBrowserSeverity"));
          return;
        }
      }

      const updatePayload: {
        emailNotificationsEnabled?: boolean;
        contactEmail?: string | null;
        notificationSeverities?: string[];
        notificationServerIds?: string[] | null;
        browserNotificationsEnabled?: boolean;
        browserNotificationSeverities?: string[];
      } = {};

      if (onlyBrowserNotifications) {
        updatePayload.browserNotificationsEnabled = currentBrowserEnabled;
        updatePayload.browserNotificationSeverities = currentBrowserEnabled
          ? currentBrowserSeverities
          : undefined;
      } else if (onlyEmailNotifications) {
        updatePayload.emailNotificationsEnabled = currentEnabled;
        updatePayload.contactEmail = currentEnabled ? currentEmail : null;
        updatePayload.notificationSeverities = currentEnabled
          ? currentSeverities
          : undefined;
        updatePayload.notificationServerIds = notificationServerIds;
      } else {
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
          if (!silent) {
            toast.success(t("modal.toastSettingsUpdated"));
          }
        },
        onError: (error: ApiError) => {
          const errorMessage =
            error.message || t("modal.toastSettingsUpdateFailed");
          toast.error(errorMessage);
          logger.error({ error }, errorMessage);
        },
      });
    },
    [notificationServerIds, t, updateSettingsMutation]
  );

  // Auto-save when email notifications toggle changes
  useEffect(() => {
    if (isInitialMount.current) return;
    const timeoutId = setTimeout(() => {
      autoSaveSettings({
        skipValidation: !emailNotificationsEnabled,
        onlyEmailNotifications: true,
        silent: true,
      });
    }, 100);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailNotificationsEnabled]);

  // Auto-save when severities change
  useEffect(() => {
    if (isInitialMount.current) return;
    const timeoutId = setTimeout(() => {
      if (emailNotificationsEnabled) {
        autoSaveSettings({ onlyEmailNotifications: true, silent: true });
      }
    }, 100);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationSeverities]);

  // Auto-save when notification server IDs change
  useEffect(() => {
    if (isInitialMount.current) return;
    const timeoutId = setTimeout(() => {
      if (emailNotificationsEnabled) {
        autoSaveSettings({ onlyEmailNotifications: true, silent: true });
      }
    }, 100);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationServerIds]);

  // Auto-save when browser notifications toggle changes
  useEffect(() => {
    if (isInitialMount.current) return;
    const timeoutId = setTimeout(() => {
      autoSaveSettings({
        skipValidation: !browserNotificationsEnabled,
        onlyBrowserNotifications: true,
        silent: true,
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
        autoSaveSettings({ onlyBrowserNotifications: true, silent: true });
      }
    }, 100);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserNotificationSeverities]);

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("modal.title")}</DialogTitle>
            <DialogDescription>{t("modal.loadingWorkspace")}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const firstWebhook = webhooks[0];
  const firstSlack = slackConfigs[0];

  // --- Webhook handlers ---
  const handleSaveWebhook = () => {
    if (!webhookUrl.trim()) {
      toast.error(t("modal.toastWebhookUrlRequired"));
      return;
    }
    let urlObj: URL;
    try {
      urlObj = new URL(webhookUrl.trim());
    } catch {
      toast.error(t("modal.toastWebhookUrlInvalid"));
      return;
    }
    if (urlObj.hostname === "hooks.slack.com") {
      toast.error(t("modal.toastWebhookSlackError"));
      return;
    }
    if (firstWebhook) {
      updateWebhookMutation.mutate(
        {
          id: firstWebhook.id,
          url: webhookUrl.trim(),
          enabled: webhookEnabled,
          secret: webhookSecret.trim() || null,
        },
        {
          onSuccess: () => toast.success(t("modal.toastWebhookUpdated")),
          onError: (error: ApiError) =>
            toast.error(error.message || t("modal.toastWebhookUpdateFailed")),
        }
      );
    } else {
      createWebhookMutation.mutate(
        {
          url: webhookUrl.trim(),
          enabled: webhookEnabled,
          secret: webhookSecret.trim() || null,
        },
        {
          onSuccess: () => toast.success(t("modal.toastWebhookCreated")),
          onError: (error: ApiError) =>
            toast.error(error.message || t("modal.toastWebhookCreateFailed")),
        }
      );
    }
  };

  const handleDeleteWebhook = () => {
    if (!firstWebhook) return;
    deleteWebhookMutation.mutate(firstWebhook.id, {
      onSuccess: () => {
        toast.success(t("modal.toastWebhookDeleted"));
        setWebhookUrl("");
        setWebhookSecret("");
        setWebhookEnabled(true);
      },
      onError: (error: ApiError) =>
        toast.error(error.message || t("modal.toastWebhookDeleteFailed")),
    });
  };

  const handleToggleWebhook = (enabled: boolean) => {
    setWebhookEnabled(enabled);
    if (!firstWebhook) return;
    updateWebhookMutation.mutate(
      { id: firstWebhook.id, enabled },
      {
        onSuccess: () =>
          toast.success(
            enabled
              ? t("modal.toastWebhookEnabled")
              : t("modal.toastWebhookDisabled")
          ),
        onError: (error: ApiError) => {
          toast.error(error.message || t("modal.toastWebhookUpdateFailed"));
          setWebhookEnabled(!enabled);
        },
      }
    );
  };

  // --- Slack handlers ---
  const handleSaveSlack = () => {
    if (!slackWebhookUrl.trim()) {
      toast.error(t("modal.toastSlackUrlRequired"));
      return;
    }
    let urlObj: URL;
    try {
      urlObj = new URL(slackWebhookUrl.trim());
    } catch {
      toast.error(t("modal.toastWebhookUrlInvalid"));
      return;
    }
    if (
      urlObj.hostname !== "hooks.slack.com" ||
      !urlObj.pathname.startsWith("/services/") ||
      urlObj.pathname.split("/").length < 4
    ) {
      toast.error(t("modal.toastSlackUrlInvalid"));
      return;
    }
    if (firstSlack) {
      updateSlackConfigMutation.mutate(
        {
          id: firstSlack.id,
          webhookUrl: slackWebhookUrl.trim(),
          enabled: slackEnabled,
        },
        {
          onSuccess: () => toast.success(t("modal.toastSlackUpdated")),
          onError: (error: ApiError) =>
            toast.error(error.message || t("modal.toastSlackUpdateFailed")),
        }
      );
    } else {
      createSlackConfigMutation.mutate(
        { webhookUrl: slackWebhookUrl.trim(), enabled: slackEnabled },
        {
          onSuccess: () => toast.success(t("modal.toastSlackCreated")),
          onError: (error: ApiError) =>
            toast.error(error.message || t("modal.toastSlackCreateFailed")),
        }
      );
    }
  };

  const handleDeleteSlack = () => {
    if (!firstSlack) return;
    deleteSlackConfigMutation.mutate(firstSlack.id, {
      onSuccess: () => {
        toast.success(t("modal.toastSlackDeleted"));
        setSlackWebhookUrl("");
        setSlackEnabled(true);
      },
      onError: (error: ApiError) =>
        toast.error(error.message || t("modal.toastSlackDeleteFailed")),
    });
  };

  const handleToggleSlack = (enabled: boolean) => {
    setSlackEnabled(enabled);
    if (!firstSlack) return;
    updateSlackConfigMutation.mutate(
      { id: firstSlack.id, enabled },
      {
        onSuccess: () =>
          toast.success(
            enabled
              ? t("modal.toastSlackEnabled")
              : t("modal.toastSlackDisabled")
          ),
        onError: (error: ApiError) => {
          toast.error(error.message || t("modal.toastSlackUpdateFailed"));
          setSlackEnabled(!enabled);
        },
      }
    );
  };

  const handleSaveEmail = () => {
    if (contactEmail.trim() && emailNotificationsEnabled) {
      autoSaveSettings({ onlyEmailNotifications: true });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("modal.title")}
            </DialogTitle>
            <DialogDescription>{t("modal.description")}</DialogDescription>
          </DialogHeader>
        </div>

        <Tabs
          defaultValue="general"
          orientation="vertical"
          className="flex flex-1 min-h-0 px-6"
        >
          <TabsList className="flex flex-col h-auto bg-transparent gap-1 pr-4 border-r min-w-[160px] rounded-none justify-start py-2">
            <TabsTrigger
              value="general"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted rounded-md"
            >
              <Settings className="h-4 w-4" />
              {t("modal.tabs.general")}
            </TabsTrigger>
            <TabsTrigger
              value="email"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted rounded-md"
            >
              <Mail className="h-4 w-4" />
              {t("modal.tabs.email")}
              <StatusDot enabled={emailNotificationsEnabled} />
            </TabsTrigger>
            <TabsTrigger
              value="browser"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted rounded-md"
            >
              <Bell className="h-4 w-4" />
              {t("modal.tabs.browser")}
              <StatusDot enabled={browserNotificationsEnabled} />
            </TabsTrigger>
            <TabsTrigger
              value="webhook"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted rounded-md"
            >
              <Webhook className="h-4 w-4" />
              {t("modal.tabs.webhook")}
              <StatusDot
                enabled={!!firstWebhook?.enabled}
                configured={!!firstWebhook}
              />
            </TabsTrigger>
            <TabsTrigger
              value="slack"
              className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted rounded-md"
            >
              <MessageSquare className="h-4 w-4" />
              {t("modal.tabs.slack")}
              <StatusDot
                enabled={!!firstSlack?.enabled}
                configured={!!firstSlack}
              />
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto pl-6 py-2">
            <TabsContent value="general" className="mt-0 min-h-[400px]">
              <GeneralTab
                servers={servers}
                notificationServerIds={notificationServerIds}
                setNotificationServerIds={setNotificationServerIds}
                selectedServers={selectedServers}
                filteredServers={filteredServers}
                selectedCount={selectedCount}
                serverSearchOpen={serverSearchOpen}
                setServerSearchOpen={setServerSearchOpen}
                serverSearchTerm={serverSearchTerm}
                setServerSearchTerm={setServerSearchTerm}
                notificationSeverities={notificationSeverities}
                setNotificationSeverities={setNotificationSeverities}
                isPending={updateSettingsMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="email" className="mt-0 min-h-[400px]">
              <EmailTab
                emailNotificationsEnabled={emailNotificationsEnabled}
                setEmailNotificationsEnabled={setEmailNotificationsEnabled}
                contactEmail={contactEmail}
                setContactEmail={setContactEmail}
                onSaveEmail={handleSaveEmail}
                isPending={updateSettingsMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="browser" className="mt-0 min-h-[400px]">
              <BrowserTab
                browserNotificationsEnabled={browserNotificationsEnabled}
                setBrowserNotificationsEnabled={setBrowserNotificationsEnabled}
                browserNotificationSeverities={browserNotificationSeverities}
                setBrowserNotificationSeverities={
                  setBrowserNotificationSeverities
                }
                notificationPermission={notificationPermission}
                setNotificationPermission={setNotificationPermission}
                isPending={updateSettingsMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="webhook" className="mt-0 min-h-[400px]">
              <WebhookTab
                webhookUrl={webhookUrl}
                setWebhookUrl={setWebhookUrl}
                webhookSecret={webhookSecret}
                setWebhookSecret={setWebhookSecret}
                webhookEnabled={webhookEnabled}
                showSecret={showSecret}
                setShowSecret={setShowSecret}
                onToggleWebhook={handleToggleWebhook}
                onSaveWebhook={handleSaveWebhook}
                onDeleteWebhook={handleDeleteWebhook}
                onShowExample={() => setShowWebhookExample(true)}
                hasExistingWebhook={!!firstWebhook}
                isSaving={
                  createWebhookMutation.isPending ||
                  updateWebhookMutation.isPending
                }
                isDeleting={deleteWebhookMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="slack" className="mt-0 min-h-[400px]">
              <SlackTab
                slackWebhookUrl={slackWebhookUrl}
                setSlackWebhookUrl={setSlackWebhookUrl}
                slackEnabled={slackEnabled}
                onToggleSlack={handleToggleSlack}
                onSaveSlack={handleSaveSlack}
                onDeleteSlack={handleDeleteSlack}
                hasExistingSlack={!!firstSlack}
                isSaving={
                  createSlackConfigMutation.isPending ||
                  updateSlackConfigMutation.isPending
                }
                isDeleting={deleteSlackConfigMutation.isPending}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-6 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={updateSettingsMutation.isPending}
          >
            {t("modal.close")}
          </Button>
        </div>
      </DialogContent>

      {/* Webhook Example Payload Modal */}
      <WebhookExampleModal
        open={showWebhookExample}
        onOpenChange={setShowWebhookExample}
      />
    </Dialog>
  );
}
