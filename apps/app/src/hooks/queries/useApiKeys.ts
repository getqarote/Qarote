/**
 * Wraps the `apiKeys` tRPC router (mint / list / revoke) for the Settings →
 * Agent Access section. The mint mutation returns the plaintext secret
 * exactly once — callers MUST surface it via the copy-once dialog and not
 * persist it anywhere else.
 *
 * `lastRequest` (last-used timestamp) is tracked natively by better-auth's
 * apiKey plugin — exposed on the list rows so the UI can render dormant
 * vs active keys.
 */

import { trpc } from "@/lib/trpc/client";

export const useApiKeys = (workspaceId: string) => {
  const utils = trpc.useUtils();

  const list = trpc.apiKeys.list.useQuery(
    { workspaceId },
    { enabled: !!workspaceId, staleTime: 30_000 }
  );

  const mint = trpc.apiKeys.mint.useMutation({
    onSuccess: () => {
      void utils.apiKeys.list.invalidate({ workspaceId });
    },
  });

  const revoke = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      void utils.apiKeys.list.invalidate({ workspaceId });
    },
  });

  return { list, mint, revoke };
};
