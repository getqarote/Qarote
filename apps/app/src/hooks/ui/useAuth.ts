import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContextDefinition";

export const useLogin = () => {
  const { login } = useAuth();
  const utils = trpc.useUtils();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutate = (
    data: { email: string; password: string },
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    setIsPending(true);
    setError(null);
    setIsError(false);
    setIsSuccess(false);

    authClient.signIn
      .email({
        email: data.email,
        password: data.password,
      })
      .then(async (result) => {
        if (result.error) {
          const err = new Error(result.error.message || "Login failed");
          setError(err);
          setIsError(true);
          setIsPending(false);
          options?.onError?.(err);
          return;
        }

        // Fetch enriched user data via tRPC
        try {
          const response = await utils.auth.session.getSession.fetch();
          const user = {
            ...response.user,
            workspaceId: response.user.workspace?.id,
          };
          login(user);
          setIsPending(false);
          setIsSuccess(true);
          options?.onSuccess?.();
        } catch (err) {
          // Sign-in succeeded (cookie is set) but enriched fetch failed —
          // fall back to basic session data so the user isn't stuck on login
          logger.warn(
            "Failed to fetch enriched session after login, using basic data:",
            err
          );
          if (result.data?.user) {
            const baUser = result.data.user;
            login({
              id: baUser.id,
              email: baUser.email,
              name: baUser.name || "",
            } as Parameters<typeof login>[0]);
            setIsPending(false);
            setIsSuccess(true);
            options?.onSuccess?.();
          } else {
            const error =
              err instanceof Error ? err : new Error("Failed to fetch session");
            setError(error);
            setIsError(true);
            setIsPending(false);
            options?.onError?.(error);
          }
        }
      })
      .catch((err) => {
        const error = err instanceof Error ? err : new Error("Login failed");
        setError(error);
        setIsError(true);
        setIsPending(false);
        options?.onError?.(error);
      });
  };

  return {
    mutate,
    isPending,
    isError,
    error,
    isSuccess,
  };
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
      await logout();
    },
    mutateAsync: async () => {
      await logout();
    },
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  };
};
