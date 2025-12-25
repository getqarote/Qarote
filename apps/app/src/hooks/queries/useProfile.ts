import { useQueryClient } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useWorkspace } from "../ui/useWorkspace";

/**
 * Profile, password, and email hooks
 */

export const useProfile = () => {
  const { isAuthenticated } = useAuth();
  const { workspace } = useWorkspace();

  const query = trpc.auth.session.getSession.useQuery(undefined, {
    enabled: isAuthenticated && !!workspace?.id,
    staleTime: 30000, // 30 seconds
  });

  return query;
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

// Password change hook
export const useChangePassword = () => {
  return trpc.auth.password.changePassword.useMutation();
};

// Email change hooks
export const useRequestEmailChange = () => {
  const queryClient = useQueryClient();

  return trpc.auth.email.requestEmailChange.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["verificationStatus"] });
    },
  });
};

export const useCancelEmailChange = () => {
  const queryClient = useQueryClient();

  return trpc.auth.email.cancelEmailChange.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["verificationStatus"] });
    },
  });
};

// Email verification status hook
export const useVerificationStatus = () => {
  const { isAuthenticated } = useAuth();

  return trpc.auth.verification.getVerificationStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
  });
};

// Password reset hooks
export const useRequestPasswordReset = () => {
  return trpc.auth.password.requestPasswordReset.useMutation();
};

export const useResetPassword = () => {
  return trpc.auth.password.resetPassword.useMutation();
};
