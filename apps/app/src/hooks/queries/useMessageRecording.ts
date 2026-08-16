/**
 * useMessageRecording hooks
 *
 * TanStack Query + tRPC subscription hooks for the Message Tracing page.
 *
 * Patterns mirror useSpyOnQueue from useRabbitMQ.ts:
 * - BoundedBuffer(500) + RAF batching for the live subscription
 * - enabled flag to pause the subscription when switching to Query mode
 */

import { trpc } from "@/lib/trpc/client";

import { useWorkspace } from "@/hooks/ui/useWorkspace";

// ---------------------------------------------------------------------------
// checkFirehoseStatus
// ---------------------------------------------------------------------------

export const useFirehoseStatus = (serverId: string, serverExists = true) => {
  const { workspace } = useWorkspace();
  return trpc.messages.recording.status.useQuery(
    { serverId, workspaceId: workspace?.id ?? "" },
    {
      enabled: !!serverId && !!workspace?.id && serverExists,
      // Never stale — always reflects live broker state
      staleTime: 0,
      gcTime: 0,
      retry: false,
    }
  );
};

// ---------------------------------------------------------------------------
// setTraceEnabled
// ---------------------------------------------------------------------------

export const useSetTraceEnabled = () => {
  return trpc.messages.recording.setEnabled.useMutation();
};
