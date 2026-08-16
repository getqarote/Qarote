import { useState } from "react";

import { trpc } from "@/lib/trpc/client";
import { SubData } from "@/lib/trpc/types";

import { useWorkspace } from "../ui/useWorkspace";

/**
 * Alert-related hooks
 * Handles alert rules, RabbitMQ alerts, thresholds, notification settings, webhooks, and Slack
 */

// Alert Rules hooks
export const useAlertRules = (enabled: boolean = true) => {
  const { workspace } = useWorkspace();
  // Pass workspaceId explicitly so the server doesn't have to fall back to
  // ctx.workspaceId / ctx.user.workspaceId — that fallback path races with
  // workspace-switch transitions and surfaces a "Workspace ID is required"
  // toast on otherwise-valid sessions.
  const query = trpc.alerts.rules.getRules.useQuery(
    { workspaceId: workspace?.id ?? "" },
    {
      enabled: enabled && !!workspace?.id,
      staleTime: 30000, // 30 seconds
    }
  );

  return query;
};

export const useUpdateAlertRule = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.alerts.rules.updateRule.useMutation({
    onSuccess: () => {
      utils.alerts.rules.getRules.invalidate();
      utils.alerts.rules.getRule.invalidate();
    },
  });

  return mutation;
};

// RabbitMQ Alert hooks
export const useRabbitMQAlerts = (
  serverId: string | null,
  vhost: string | null,
  options?: {
    limit?: number;
    offset?: number;
    severity?: string;
    category?: string;
    resolved?: boolean;
    enabled?: boolean;
  },
  serverExists: boolean = true
) => {
  const { workspace } = useWorkspace();
  const enabled =
    serverExists &&
    (options?.enabled ?? true) &&
    !!serverId &&
    !!workspace?.id &&
    !!vhost;

  const [data, setData] = useState<
    SubData<typeof trpc.rabbitmq.alerts.watchAlerts> | undefined
  >();
  const [error, setError] = useState<Error | null>(null);

  trpc.rabbitmq.alerts.watchAlerts.useSubscription(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
      vhost: vhost ? encodeURIComponent(vhost) : encodeURIComponent("/"),
      limit: options?.limit?.toString(),
      offset: options?.offset?.toString(),
      severity: options?.severity,
      category: options?.category,
      resolved: options?.resolved ? "true" : undefined,
    },
    {
      enabled,
      onData: (d) => {
        setError(null);
        setData(d);
      },
      onError: setError,
    }
  );

  return { data, error, isLoading: enabled && !data, isError: !!error };
};

export const useResolvedAlerts = (
  serverId: string | null,
  vhost: string | null,
  options?: {
    limit?: number;
    offset?: number;
    severity?: string;
    category?: string;
    enabled?: boolean;
  }
) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.alerts.getResolvedAlerts.useQuery(
    {
      serverId: serverId || "",
      workspaceId: workspace?.id || "",
      vhost: vhost ? encodeURIComponent(vhost) : encodeURIComponent("/"),
      limit: options?.limit?.toString(),
      offset: options?.offset?.toString(),
      severity: options?.severity,
      category: options?.category,
    },
    {
      enabled:
        (options?.enabled ?? true) && !!serverId && !!workspace?.id && !!vhost,
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // Refetch every minute
    }
  );

  return query;
};

// Alert Notification Settings hooks
export const useAlertNotificationSettings = (enabled: boolean = true) => {
  const { workspace } = useWorkspace();

  const query = trpc.rabbitmq.alerts.getNotificationSettings.useQuery(
    {
      workspaceId: workspace?.id || "",
    },
    {
      enabled: !!workspace?.id && enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
      placeholderData: {
        success: true,
        settings: {
          emailNotificationsEnabled: true,
          contactEmail: null,
          notificationSeverities: ["critical", "warning", "info"],
          notificationServerIds: null,
          browserNotificationsEnabled: false,
          browserNotificationSeverities: ["critical", "warning", "info"],
        },
      },
    }
  );

  return query;
};

export const useUpdateAlertNotificationSettings = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.alerts.updateNotificationSettings.useMutation({
    onSuccess: () => {
      // Invalidate notification settings
      utils.rabbitmq.alerts.getNotificationSettings.invalidate();
    },
  });
};

// Alert lifecycle mutations. The active feed is a 10s subscription that
// reconciles on its own, so these only invalidate the resolved-alerts query
// (a resolve moves a row into it); the UI applies an optimistic local update
// for instant feedback in the meantime.
export const useAcknowledgeAlert = () => {
  const utils = trpc.useUtils();
  return trpc.rabbitmq.alerts.acknowledgeAlert.useMutation({
    onSuccess: () => utils.rabbitmq.alerts.getResolvedAlerts.invalidate(),
  });
};

export const useSnoozeAlert = () => {
  return trpc.rabbitmq.alerts.snoozeAlert.useMutation();
};

export const useResolveAlert = () => {
  const utils = trpc.useUtils();
  return trpc.rabbitmq.alerts.resolveAlert.useMutation({
    onSuccess: () => utils.rabbitmq.alerts.getResolvedAlerts.invalidate(),
  });
};

// Reopen moves a row OUT of the resolved feed and back into active, so it
// invalidates both queries; the UI also applies an optimistic local update.
export const useReopenAlert = () => {
  const utils = trpc.useUtils();
  return trpc.rabbitmq.alerts.reopenAlert.useMutation({
    onSuccess: () => utils.rabbitmq.alerts.getResolvedAlerts.invalidate(),
  });
};

// Webhook hooks
export const useWebhooks = (enabled: boolean = true) => {
  const { workspace } = useWorkspace();

  return trpc.alerts.webhook.getWebhooks.useQuery(undefined, {
    enabled: !!workspace?.id && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateWebhook = () => {
  const utils = trpc.useUtils();

  return trpc.alerts.webhook.createWebhook.useMutation({
    onSuccess: () => {
      utils.alerts.webhook.getWebhooks.invalidate();
    },
  });
};

export const useUpdateWebhook = () => {
  const utils = trpc.useUtils();

  return trpc.alerts.webhook.updateWebhook.useMutation({
    onSuccess: () => {
      utils.alerts.webhook.getWebhooks.invalidate();
    },
  });
};

// Slack hooks
export const useSlackConfigs = (enabled: boolean = true) => {
  const { workspace } = useWorkspace();

  return trpc.alerts.slack.getConfigs.useQuery(undefined, {
    enabled: !!workspace?.id && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateSlackConfig = () => {
  const utils = trpc.useUtils();

  return trpc.alerts.slack.createConfig.useMutation({
    onSuccess: () => {
      utils.alerts.slack.getConfigs.invalidate();
    },
  });
};

// Sends a sample alert to one configured channel; returns { success, error? }.
export const useTestChannel = () => {
  return trpc.alerts.test.testChannel.useMutation();
};

export const useUpdateSlackConfig = () => {
  const utils = trpc.useUtils();

  return trpc.alerts.slack.updateConfig.useMutation({
    onSuccess: () => {
      utils.alerts.slack.getConfigs.invalidate();
    },
  });
};
