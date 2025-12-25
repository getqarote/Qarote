import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContextDefinition";

export const useLogin = () => {
  const { login } = useAuth();

  const mutation = trpc.auth.session.login.useMutation({
    onSuccess: async (data) => {
      logger.info("Login success", data);
      login(data.token, data.user);
    },
  });

  return mutation;
};

export const useRegister = () => {
  return trpc.auth.registration.register.useMutation({
    // No onSuccess callback - user must verify email before logging in
  });
};

export const useLogout = () => {
  const { logout } = useAuth();

  return {
    mutate: async () => {
      // Always logout on the client
      logout();
    },
    mutateAsync: async () => {
      logout();
      return Promise.resolve();
    },
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  };
};

export const useAcceptInvitation = () => {
  const { login } = useAuth();

  const mutation = trpc.public.invitation.accept.useMutation({
    onSuccess: (data) => {
      login(data.token, data.user);
    },
  });

  return mutation;
};
