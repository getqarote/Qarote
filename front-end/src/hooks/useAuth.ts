import { useMutation } from "@tanstack/react-query";

import { apiClient, LoginRequest, RegisterRequest } from "@/lib/api";
import { logger } from "@/lib/logger";

import { useAuth } from "@/contexts/AuthContextDefinition";

export const useLogin = () => {
  const { login } = useAuth();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      return await apiClient.login(credentials);
    },
    onSuccess: async (data) => {
      logger.info("Login success", data);
      login(data.token, data.user);
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: async (userData: RegisterRequest) => {
      return await apiClient.register(userData);
    },
    // No onSuccess callback - user must verify email before logging in
  });
};

export const useLogout = () => {
  const { logout } = useAuth();

  return useMutation({
    mutationFn: async () => {
      // await apiClient.logout();
    },
    onSuccess: () => {
      logout();
    },
    onError: () => {
      // Always logout on the client even if the server request fails
      logout();
    },
  });
};

export const useAcceptInvitation = () => {
  const { login } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      token: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => {
      const response = await apiClient.acceptInvitationWithRegistration(
        params.token,
        {
          password: params.password,
          firstName: params.firstName,
          lastName: params.lastName,
        }
      );
      return response;
    },
    onSuccess: (data) => {
      login(data.token, data.user);
    },
  });
};
