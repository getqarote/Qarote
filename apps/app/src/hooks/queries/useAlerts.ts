import { useState } from "react";

import { trpc } from "@/lib/trpc/client";

import { useWorkspace } from "../ui/useWorkspace";

/** Extract the data type yielded by a tRPC subscription hook. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SubData<T extends { useSubscription: (input: any, opts: any) => void }> =
  Parameters<T["useSubscription"]>[1] extends { onData?: (d: infer D) => void }
    ? D
    : never;

/**
 * Alert-related hooks
 * Handles alert rules, RabbitMQ alerts, thresholds, notification settings, webhooks, and Slack
 */

// Alert Rules hooks
export const useAlertRules = (enabled: boolean = true) => {
  const query = trpc.alerts.rules.getRules.useQuery(undefined, {
    enabled: enabled,
    staleTime: 30000, // 30 seconds
  });

  return query;
};

export const useCreateAlertRule = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.alerts.rules.createRule.useMutation({
    onSuccess: () => {
      utils.alerts.rules.getRules.invalidate();
    },
  });

  // The tRPC mutation already accepts the correct format, so we can return it directly
  // But we need to ensure the response format matches the old API
  return mutation;
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

export const useDeleteAlertRule = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.alerts.rules.deleteRule.useMutation({
    onSuccess: () => {
      utils.alerts.rules.getRules.invalidate();
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
  }
) => {
  const { workspace } = useWorkspace();
  const enabled =
    (options?.enabled ?? true) && !!serverId && !!workspace?.id && !!vhost;

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
      onData: setData,
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

export const useDeleteWebhook = () => {
  const utils = trpc.useUtils();

  return trpc.alerts.webhook.deleteWebhook.useMutation({
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

export const useUpdateSlackConfig = () => {
  const utils = trpc.useUtils();

  return trpc.alerts.slack.updateConfig.useMutation({
    onSuccess: () => {
      utils.alerts.slack.getConfigs.invalidate();
    },
  });
};

export const useDeleteSlackConfig = () => {
  const utils = trpc.useUtils();

  return trpc.alerts.slack.deleteConfig.useMutation({
    onSuccess: () => {
      utils.alerts.slack.getConfigs.invalidate();
    },
  });
};
