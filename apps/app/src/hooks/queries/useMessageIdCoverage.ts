import { trpc } from "@/lib/trpc/client";

import { useWorkspace } from "../ui/useWorkspace";

interface UseMessageIdCoverageOptions {
  /** Pass false when the server record does not exist yet to skip the query. */
  serverExists?: boolean;
}

/**
 * messageId coverage stat for the server dashboard.
 *
 * Polls every 45 s — NOT 60 s — because at exactly 60 s the TanStack
 * refetch interval (mount-relative) misaligns with the backend helper's
 * 60 s Postgres cache TTL (first-call-relative), guaranteeing roughly
 * half the polls miss the warm cache. 45 s gives consistent cache hits
 * without doubling DB pressure.
 *
 * Returns `isHidden: true` when the procedure responded with
 * `firehoseEnabled: false`, when no data is available yet, OR when the
 * query errored. The consumer renders nothing in that case. We
 * deliberately do NOT swallow errors as a `{firehoseEnabled: false}`
 * fallback shape — that would mask real auth/500 failures as "firehose
 * off" and break the discriminated-union narrowing on the happy path.
 *
 * Signature mirrors `useDiagnosis`: `serverId: string | null` so
 * callers can pass `selectedServerId` directly without coercion, plus
 * an optional `serverExists` gate that prevents the query firing for
 * deleted servers (e.g. between a delete mutation and its parent
 * re-render).
 *
 * See docs/internal/server-messageid-coverage-stat.md.
 */
export const useMessageIdCoverage = (
  serverId: string | null,
  options: UseMessageIdCoverageOptions = {}
) => {
  const { workspace } = useWorkspace();
  const { serverExists = true } = options;

  const query = trpc.rabbitmq.server.messageIdCoverage.useQuery(
    { workspaceId: workspace?.id ?? "", id: serverId ?? "" },
    {
      enabled: serverExists && !!serverId && !!workspace?.id,
      staleTime: 45_000,
      refetchInterval: 45_000,
    }
  );

  const isHidden =
    !query.data || query.data.firehoseEnabled === false || query.isError;

  return { ...query, isHidden };
};
