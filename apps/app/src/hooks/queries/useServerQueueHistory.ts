import { trpc } from "@/lib/trpc/client";

import type { HistoricalRange } from "@/components/HistoricalRangeSelector";

interface UseServerQueueHistoryParams {
  serverId: string | null;
  rangeHours: HistoricalRange;
  centeredAt?: string;
  enabled?: boolean;
  serverExists?: boolean;
}

export const useServerQueueHistory = ({
  serverId,
  rangeHours,
  centeredAt,
  enabled = true,
  serverExists = true,
}: UseServerQueueHistoryParams) => {
  return trpc.rabbitmq.metrics.getServerQueueHistory.useQuery(
    {
      serverId: serverId || "",
      rangeHours,
      centeredAt,
    },
    {
      enabled: enabled && !!serverId && serverExists,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};
