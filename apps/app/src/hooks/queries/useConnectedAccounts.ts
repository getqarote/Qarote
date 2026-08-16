import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";

const CONNECTED_ACCOUNTS_KEY = ["connected-accounts"] as const;

/**
 * List the sign-in methods linked to the current user (e.g. email/password
 * "credential" + any social/SSO providers). Backed by better-auth's core
 * account management — no server changes needed.
 */
export function useConnectedAccounts() {
  return useQuery({
    queryKey: CONNECTED_ACCOUNTS_KEY,
    queryFn: async () => {
      const res = await authClient.listAccounts();
      if (res.error) {
        throw new Error(res.error.message ?? "Failed to load accounts");
      }
      return res.data ?? [];
    },
  });
}

/**
 * Unlink a linked account. better-auth refuses to unlink the last remaining
 * account (error code FAILED_TO_UNLINK_LAST_ACCOUNT) — we surface that code so
 * the UI can show a precise message, and otherwise re-throw a generic error.
 */
export function useUnlinkAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { providerId: string; accountId: string }) => {
      const res = await authClient.unlinkAccount(params);
      if (res.error) {
        // Prefer the stable code over the human message for branching.
        throw new Error(
          res.error.code ?? res.error.message ?? "Failed to unlink account"
        );
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CONNECTED_ACCOUNTS_KEY }),
  });
}

export const FAILED_TO_UNLINK_LAST_ACCOUNT = "FAILED_TO_UNLINK_LAST_ACCOUNT";
