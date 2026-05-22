import { trpc } from "@/lib/trpc/client";

import { useWorkspace } from "@/hooks/ui/useWorkspace";

export const useScanDiscoveryOverview = (
  serverId: string | null,
  serverExists: boolean = true
) => {
  const { workspace } = useWorkspace();
  return trpc.rabbitmq.overview.getOverview.useQuery(
    { serverId: serverId ?? "", workspaceId: workspace?.id ?? "" },
    {
      enabled: !!workspace?.id && !!serverId && serverExists,
      staleTime: 0,
      retry: 2,
    }
  );
};

export const useScanDiscoveryTopology = (
  serverId: string | null,
  enabled: boolean
) => {
  const { workspace } = useWorkspace();
  return trpc.rabbitmq.topology.getTopology.useQuery(
    { serverId: serverId ?? "", workspaceId: workspace?.id ?? "" },
    {
      enabled: enabled && !!workspace?.id && !!serverId,
      staleTime: 0,
      retry: 1,
    }
  );
};

export const useScanDiscoveryTrigger = () => {
  const utils = trpc.useUtils();
  return trpc.rabbitmq.scan.triggerScan.useMutation({
    onSuccess: () => {
      utils.rabbitmq.scan.getFindings.invalidate();
    },
  });
};

/**
 * Imperative fetcher for config findings. triggerScan returns upsert counts,
 * not the actual finding rows — call this after a successful trigger to load
 * the persisted findings array for the reveal screen.
 */
export const useScanDiscoveryFindingsFetcher = () => {
  const utils = trpc.useUtils();
  return (serverId: string, workspaceId: string) =>
    utils.rabbitmq.scan.getFindings.fetch({
      serverId,
      workspaceId,
      resolved: false,
      limit: 50,
    });
};

export const useScanDiscoveryNotifSettings = (
  serverId: string | null,
  enabled: boolean
) => {
  const { workspace } = useWorkspace();
  return trpc.rabbitmq.alerts.getNotificationSettings.useQuery(
    { serverId: serverId ?? "", workspaceId: workspace?.id ?? "" },
    { enabled: enabled && !!workspace?.id && !!serverId, staleTime: 0 }
  );
};
