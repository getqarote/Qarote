import type { Dispatch, SetStateAction } from "react";

export interface SeverityCheckboxGroupProps {
  severities: string[];
  onChange: (severities: string[]) => void;
  disabled?: boolean;
  idPrefix: string;
  t: (key: string) => string;
}

export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
}

export interface GeneralTabProps {
  servers: Server[];
  notificationServerIds: string[] | null;
  setNotificationServerIds: Dispatch<SetStateAction<string[] | null>>;
  selectedServers: Server[];
  filteredServers: Server[];
  selectedCount: number;
  serverSearchOpen: boolean;
  setServerSearchOpen: (open: boolean) => void;
  serverSearchTerm: string;
  setServerSearchTerm: (term: string) => void;
  notificationSeverities: string[];
  setNotificationSeverities: (severities: string[]) => void;
  isPending: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export interface EmailTabProps {
  emailNotificationsEnabled: boolean;
  setEmailNotificationsEnabled: (enabled: boolean) => void;
  contactEmail: string;
  setContactEmail: (email: string) => void;
  onSaveEmail: () => void;
  isPending: boolean;
  t: (key: string) => string;
}

export interface BrowserTabProps {
  browserNotificationsEnabled: boolean;
  setBrowserNotificationsEnabled: (enabled: boolean) => void;
  browserNotificationSeverities: string[];
  setBrowserNotificationSeverities: (severities: string[]) => void;
  notificationPermission: NotificationPermission | "unsupported";
  setNotificationPermission: (
    permission: NotificationPermission | "unsupported"
  ) => void;
  isPending: boolean;
  t: (key: string) => string;
}

export interface WebhookTabProps {
  webhookUrl: string;
  setWebhookUrl: (url: string) => void;
  webhookSecret: string;
  setWebhookSecret: (secret: string) => void;
  webhookEnabled: boolean;
  showSecret: boolean;
  setShowSecret: (show: boolean) => void;
  onToggleWebhook: (enabled: boolean) => void;
  onSaveWebhook: () => void;
  onDeleteWebhook: () => void;
  onShowExample: () => void;
  hasExistingWebhook: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  t: (key: string) => string;
}

export interface SlackTabProps {
  slackWebhookUrl: string;
  setSlackWebhookUrl: (url: string) => void;
  slackEnabled: boolean;
  onToggleSlack: (enabled: boolean) => void;
  onSaveSlack: () => void;
  onDeleteSlack: () => void;
  hasExistingSlack: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  t: (key: string) => string;
}
