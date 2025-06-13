import { useMutation } from "@tanstack/react-query";
import { apiClient, LoginRequest, RegisterRequest } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export const useLogin = () => {
  const { login } = useAuth();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await apiClient.login(credentials);
      return response;
    },
    onSuccess: (data) => {
      login(data.token, data.user);
    },
  });
};

export const useRegister = () => {
  const { login } = useAuth();

  return useMutation({
    mutationFn: async (userData: RegisterRequest) => {
      const response = await apiClient.register(userData);
      return response;
    },
    onSuccess: (data) => {
      login(data.token, data.user);
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuth();

  return useMutation({
    mutationFn: async () => {
      await apiClient.logout();
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
