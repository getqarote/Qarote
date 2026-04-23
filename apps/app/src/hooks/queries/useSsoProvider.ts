import { trpc } from "@/lib/trpc/client";

export const useSsoProviderConfig = (options?: { enabled?: boolean }) => {
  return trpc.sso.getProviderConfig.useQuery(undefined, {
    enabled: options?.enabled ?? true,
  });
};

export const useUpdateSsoProvider = (options?: {
  onSuccess?: () => void;
  onError?: (error: { message: string }) => void;
}) => {
  const utils = trpc.useUtils();

  return trpc.sso.updateProvider.useMutation({
    onSuccess: () => {
      utils.sso.getProviderConfig.invalidate();
      utils.sso.getConfig.invalidate();
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
};

export const useDeleteSsoProvider = (options?: {
  onSuccess?: () => void;
  onError?: (error: { message: string }) => void;
}) => {
  const utils = trpc.useUtils();

  return trpc.sso.deleteProvider.useMutation({
    onSuccess: () => {
      utils.sso.getProviderConfig.invalidate();
      utils.sso.getConfig.invalidate();
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
};

export const useTestSsoConnection = (options?: {
  onSuccess?: (data: {
    success: boolean;
    issuer?: string;
    error?: string;
  }) => void;
  onError?: (error: { message: string }) => void;
}) => {
  return trpc.sso.testConnection.useMutation({
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
};

export const useRegisterSsoProvider = (options?: {
  onSuccess?: () => void;
  onError?: (error: { message: string }) => void;
}) => {
  const utils = trpc.useUtils();

  return trpc.sso.registerProvider.useMutation({
    onSuccess: () => {
      utils.sso.getProviderConfig.invalidate();
      utils.sso.getConfig.invalidate();
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
};
