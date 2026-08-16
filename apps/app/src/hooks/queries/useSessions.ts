import { useMutation } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";

/**
 * Revoke every session except the current one ("sign out everywhere else").
 * Backed by better-auth's core session management — no server changes needed.
 */
export function useRevokeOtherSessions() {
  return useMutation({
    mutationFn: async () => {
      const res = await authClient.revokeOtherSessions();
      if (res.error) {
        throw new Error(res.error.message ?? "Failed to revoke sessions");
      }
    },
  });
}
