import type { AlertSeverity } from "@/lib/api/alertTypes";
import { trpc } from "@/lib/trpc/client";

import { useWorkspace } from "../ui/useWorkspace";

export const useGetFindings = (
  serverId: string | null,
  options?: {
    resolved?: boolean;
    dismissed?: boolean;
    severity?: AlertSeverity;
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }
) => {
  const { workspace } = useWorkspace();
  const enabled = (options?.enabled ?? true) && !!serverId && !!workspace?.id;

  return trpc.rabbitmq.scan.getFindings.useQuery(
    {
      serverId: serverId ?? "",
      workspaceId: workspace?.id ?? "",
      resolved: options?.resolved,
      dismissed: options?.dismissed,
      severity: options?.severity,
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
    },
    { enabled, staleTime: 30_000 }
  );
};

export const useTriggerScan = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.scan.triggerScan.useMutation({
    onSuccess: () => {
      utils.rabbitmq.scan.getFindings.invalidate();
    },
  });
};

export const useResolveFinding = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.scan.resolveFinding.useMutation({
    onSuccess: () => {
      utils.rabbitmq.scan.getFindings.invalidate();
    },
  });
};

export const useDismissFinding = () => {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.scan.dismissFinding.useMutation({
    onSuccess: () => {
      utils.rabbitmq.scan.getFindings.invalidate();
    },
  });
};
