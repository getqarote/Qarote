/**
 * Capability snapshot hooks — read the persisted snapshot for a server,
 * trigger a manual refresh, and centralise the invalidation contract.
 *
 * The snapshot is what `<FeatureGateCard>` and `<ServerCapabilityBadge>`
 * render: version, productName, plugin list, hasFirehoseExchange, and
 * the `capabilitiesAt` timestamp used for the "Last checked X ago"
 * footer. The frontend never reads the JSON column directly — it goes
 * through `rabbitmq.getCapabilities` which already merges any
 * `capabilityOverride`.
 */

import { trpc } from "@/lib/trpc/client";

import { useWorkspace } from "../ui/useWorkspace";

interface UseCapabilitiesOptions {
  /** Disable the query (e.g. while a parent component still loads). */
  enabled?: boolean;
  /**
   * Set to `false` when the server row was just deleted or hasn't been
   * created yet — prevents the query from continuing to hammer
   * `getCapabilities` for a missing record while the caller clears
   * `serverId`. Mirrors the same option on the other server-scoped
   * query hooks in this app.
   */
  serverExists?: boolean;
}

/**
 * Read the capability snapshot for `serverId`.
 *
 * `data.snapshot` is `null` when the server has never been profiled
 * (deploy backfill in flight) or when the persisted JSON is malformed.
 * Pages render a "Cannot verify compatibility" state in that case.
 */
export function useCapabilities(
  serverId: string | null | undefined,
  options: UseCapabilitiesOptions = {}
) {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";

  return trpc.rabbitmq.server.getCapabilities.useQuery(
    { id: serverId ?? "", workspaceId },
    {
      enabled:
        (options.enabled ?? true) &&
        (options.serverExists ?? true) &&
        Boolean(serverId) &&
        Boolean(workspaceId),
      // Capability snapshots refresh on a daily cron — the persisted
      // value rarely changes within a session. 1-min staleTime keeps
      // the UI snappy on Re-check without thrashing.
      staleTime: 60_000,
    }
  );
}

/**
 * Trigger a manual capability re-detection, with the right
 * invalidation contract:
 *   - The capability snapshot for this server.
 *   - Every `featureGate.evaluate` query for this server (the gate may
 *     flip from blocked → ok after Re-check).
 *
 * The mutation is server-side rate-limited to 1 attempt / server / 60 s
 * (counts ATTEMPTS, not successes — broken brokers can't dodge it). The
 * server returns `TOO_MANY_REQUESTS` with a localised message; callers
 * surface it via standard tRPC error UI.
 */
export function useRecheckCapabilities() {
  const utils = trpc.useUtils();

  return trpc.rabbitmq.server.recheckCapabilities.useMutation({
    onSuccess: (_data, variables) => {
      // Invalidate the cache entry keyed on the workspace the
      // mutation was actually issued against. Closing over a
      // hook-scoped `workspaceId` would invalidate the wrong key if
      // the user switched workspaces while the mutation was in
      // flight (tRPC variables are the source of truth for the key).
      const { id: serverId, workspaceId } = variables;
      // Refresh the snapshot view that drives the badge / card footer.
      void utils.rabbitmq.server.getCapabilities.invalidate({
        id: serverId,
        workspaceId,
      });
      // Refresh every gate evaluation that may depend on the new
      // snapshot — TanStack invalidates on partial-key match, so any
      // call with this serverId is hit, regardless of which feature.
      void utils.featureGate.evaluate.invalidate(undefined, {
        predicate: (query) => {
          const input = query.queryKey[1] as
            | { input?: { serverId?: string } }
            | undefined;
          return input?.input?.serverId === serverId;
        },
      });
    },
  });
}
