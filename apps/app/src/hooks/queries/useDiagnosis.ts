import { trpc } from "@/lib/trpc/client";

import { useWorkspace } from "@/hooks/ui/useWorkspace";

interface UseDiagnosisOptions {
  enabled?: boolean;
  /** Pass false when the server record does not exist yet to skip the query. */
  serverExists?: boolean;
}

export function useDiagnosis(
  serverId: string | null,
  windowMinutes: number = 120,
  options: UseDiagnosisOptions = {}
) {
  const { workspace } = useWorkspace();
  const { enabled = true, serverExists = true } = options;

  const query = trpc.rabbitmq.incident.getIncidentDiagnosis.useQuery(
    {
      serverId: serverId ?? "",
      workspaceId: workspace?.id ?? "",
      windowMinutes,
    },
    {
      enabled: enabled && serverExists && !!serverId && !!workspace?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes — match server cache TTL
      retry: (failureCount, error) => {
        const code = (error as { data?: { code?: string } })?.data?.code;
        // Don't retry on expected failures
        if (
          code === "FORBIDDEN" ||
          code === "NOT_FOUND" ||
          code === "PRECONDITION_FAILED"
        )
          return false;
        return failureCount < 2;
      },
    }
  );

  // Expose the extracted tRPC error code so callers don't have to re-parse
  // the error object themselves (avoids duplicated type-assertion boilerplate).
  const errorCode =
    (query.error as { data?: { code?: string } } | null)?.data?.code ?? null;

  return { ...query, errorCode };
}
