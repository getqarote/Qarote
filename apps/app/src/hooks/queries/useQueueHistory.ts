import { keepPreviousData } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc/client";

import type { HistoricalRange } from "@/components/HistoricalRangeSelector";

interface UseQueueHistoryParams {
  serverId: string | null;
  queueName: string | undefined;
  vhost: string;
  rangeHours: HistoricalRange;
  enabled?: boolean;
  serverExists?: boolean;
}

export const useQueueHistory = ({
  serverId,
  queueName,
  vhost,
  rangeHours,
  enabled = true,
  serverExists = true,
}: UseQueueHistoryParams) => {
  return trpc.rabbitmq.metrics.getQueueHistory.useQuery(
    {
      serverId: serverId || "",
      queueName: queueName || "",
      vhost,
      rangeHours,
    },
    {
      enabled: enabled && !!serverId && !!queueName && serverExists,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData,
    }
  );
};
