import { isSelfHostedMode } from "@/lib/featureFlags";
import { trpc } from "@/lib/trpc/client";

export const useSelfhostedSsoSettings = (options?: { enabled?: boolean }) => {
  return trpc.selfhostedSso.getSettings.useQuery(undefined, {
    enabled: options?.enabled ?? isSelfHostedMode(),
  });
};

export const useSsoUpdate = (options?: {
  onSuccess?: () => void;
  onError?: (error: { message: string }) => void;
}) => {
  const utils = trpc.useUtils();

  return trpc.selfhostedSso.updateSettings.useMutation({
    onSuccess: () => {
      options?.onSuccess?.();
      utils.selfhostedSso.getSettings.invalidate();
    },
    onError: options?.onError,
  });
};

export const useSsoTestConnection = (options?: {
  onSuccess?: (data: {
    success: boolean;
    issuer?: string;
    error?: string;
  }) => void;
  onError?: (error: { message: string }) => void;
}) => {
  return trpc.selfhostedSso.testConnection.useMutation({
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
};
