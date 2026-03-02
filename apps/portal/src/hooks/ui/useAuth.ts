import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContext";

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
