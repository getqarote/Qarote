import { trpc } from "@/lib/trpc/client";

/**
 * Permanently delete the caller's own account. On success the session is
 * already invalidated server-side (cascade), so the UI signs out and hard-
 * navigates to the login screen.
 */
export const useDeleteAccount = () => trpc.user.deleteAccount.useMutation();
